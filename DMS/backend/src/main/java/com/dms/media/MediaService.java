package com.dms.media;

import com.dms.exception.BadRequestException;
import com.dms.exception.ResourceNotFoundException;
import com.dms.incident.Incident;
import com.dms.incident.IncidentRepository;
import com.dms.user.User;
import com.dms.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaService {

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "image/jpeg", "image/jpg", "image/png", "image/gif",
        "image/webp", "image/bmp", "image/tiff",
        "video/mp4", "video/quicktime", "video/x-msvideo",
        "video/x-matroska", "video/webm", "video/mpeg"
    );

    private static final Map<String, byte[]> MAGIC_BYTES = new LinkedHashMap<>();
    static {
        MAGIC_BYTES.put("image/jpeg",      new byte[]{(byte)0xFF, (byte)0xD8, (byte)0xFF});
        MAGIC_BYTES.put("image/png",       new byte[]{(byte)0x89, 0x50, 0x4E, 0x47});
        MAGIC_BYTES.put("image/gif",       new byte[]{0x47, 0x49, 0x46, 0x38});
        MAGIC_BYTES.put("image/webp",      new byte[]{0x52, 0x49, 0x46, 0x46}); // RIFF header
        MAGIC_BYTES.put("image/bmp",       new byte[]{0x42, 0x4D});
        MAGIC_BYTES.put("video/mp4",       new byte[]{0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70}); // ftyp box
        MAGIC_BYTES.put("video/quicktime", new byte[]{0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70});
    }

    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of(
        "exe", "bat", "cmd", "sh", "php", "js", "html", "htm",
        "vbs", "ps1", "jar", "war", "class", "py", "rb", "pl",
        "asp", "aspx", "jsp", "cgi", "dll", "so", "scr", "msi"
    );

    private final MediaRepository mediaRepository;
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;

    @Value("${app.file-upload-dir:uploads/}")
    private String uploadDir;

    public MediaDTO uploadMedia(Long incidentId, MultipartFile file, String email) throws IOException {
        validateFile(file);

        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        File dir = new File(uploadDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        String safeOriginalName = sanitizeFileName(file.getOriginalFilename());
        String fileName = UUID.randomUUID().toString() + "_" + safeOriginalName;
        Path uploadDirAbs = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path filePath = uploadDirAbs.resolve(fileName).normalize();

        // Verify resolved path is still inside upload dir (prevent path traversal)
        if (!filePath.startsWith(uploadDirAbs)) {
            throw new BadRequestException("Invalid file path");
        }

        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String url = "/uploads/" + fileName;

        Media media = Media.builder()
                .fileName(fileName)
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .url(url)
                .incident(incident)
                .uploadedBy(user)
                .build();

        log.info("Media uploaded: {} for incident {} by {}", fileName, incidentId, email);
        return MediaDTO.fromEntity(mediaRepository.save(media));
    }

    public List<MediaDTO> getMediaForIncident(Long incidentId) {
        return mediaRepository.findByIncident_IncidentId(incidentId).stream()
                .map(MediaDTO::fromEntity)
                .collect(Collectors.toList());
    }

    private void validateFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty or missing");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File size exceeds the maximum allowed size of 20 MB");
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            throw new BadRequestException("File name is missing");
        }

        String extension = getExtension(originalName).toLowerCase();
        if (DANGEROUS_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("File type '" + extension + "' is not allowed for security reasons");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("File type '" + contentType + "' is not allowed. Only images and videos are accepted.");
        }

        // Magic bytes check — prevent MIME spoofing
        byte[] header = new byte[12];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(header);
            if (read < 4) {
                throw new BadRequestException("File appears to be empty or corrupted");
            }
        }
        verifyMagicBytes(contentType, header, originalName);
    }

    private void verifyMagicBytes(String contentType, byte[] header, String fileName) {
        // JPEG
        if (contentType.contains("jpeg") || contentType.contains("jpg")) {
            if (!startsWith(header, MAGIC_BYTES.get("image/jpeg"))) {
                throw new BadRequestException("File '" + fileName + "' does not appear to be a valid JPEG image");
            }
            return;
        }
        // PNG
        if (contentType.contains("png")) {
            if (!startsWith(header, MAGIC_BYTES.get("image/png"))) {
                throw new BadRequestException("File '" + fileName + "' does not appear to be a valid PNG image");
            }
            return;
        }
        // GIF
        if (contentType.contains("gif")) {
            if (!startsWith(header, MAGIC_BYTES.get("image/gif"))) {
                throw new BadRequestException("File '" + fileName + "' does not appear to be a valid GIF image");
            }
            return;
        }
        // WebP (RIFF header)
        if (contentType.contains("webp")) {
            if (!startsWith(header, MAGIC_BYTES.get("image/webp"))) {
                throw new BadRequestException("File '" + fileName + "' does not appear to be a valid WebP image");
            }
            return;
        }
        // BMP
        if (contentType.contains("bmp")) {
            if (!startsWith(header, MAGIC_BYTES.get("image/bmp"))) {
                throw new BadRequestException("File '" + fileName + "' does not appear to be a valid BMP image");
            }
            return;
        }
        // Videos — just check not an executable; exact magic varies widely
        if (contentType.startsWith("video/")) {
            // Reject if it looks like a PE executable (Windows) or ELF (Linux)
            if ((header[0] == 0x4D && header[1] == 0x5A) || // MZ / PE
                (header[0] == 0x7F && header[1] == 0x45 && header[2] == 0x4C && header[3] == 0x46)) { // ELF
                throw new BadRequestException("File '" + fileName + "' appears to be an executable, not a video");
            }
        }
    }

    private boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) return false;
        }
        return true;
    }

    private String getExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot >= 0 ? fileName.substring(dot + 1) : "";
    }

    private String sanitizeFileName(String originalName) {
        if (originalName == null) return "upload";
        // Keep only safe characters: alphanumeric, dash, underscore, dot
        String safe = originalName.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        // Remove leading dots (hidden files)
        safe = safe.replaceAll("^\\.+", "");
        // Truncate to 100 chars
        if (safe.length() > 100) safe = safe.substring(safe.length() - 100);
        return safe.isBlank() ? "upload" : safe;
    }
}
