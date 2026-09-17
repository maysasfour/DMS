/**
 * MediaService.java
 *
 * Service layer responsible for handling all media file uploads and retrieval
 * within the Disaster Management System (DMS). This service allows responders
 * and citizens to attach photo and video evidence to incident reports, which
 * aids in situational awareness and AI-assisted incident verification.
 *
 * Security is a primary concern: files are validated by size, MIME type,
 * file extension, and binary magic bytes to prevent upload of malicious
 * executables disguised as media. Path traversal attacks are also blocked.
 *
 * Uploaded files are stored on the local filesystem under the configured
 * upload directory and referenced by URL in the Media entity linked to
 * the corresponding Incident record.
 */
package com.dms.media;

// DMS domain exception for malformed or disallowed client input
import com.dms.exception.BadRequestException;
// DMS domain exception for when a requested entity cannot be found
import com.dms.exception.ResourceNotFoundException;
// Incident entity — media files are always associated with a specific incident
import com.dms.incident.Incident;
// Used to look up incidents by ID when attaching uploaded media
import com.dms.incident.IncidentRepository;
// User entity — tracks which DMS user uploaded each media file
import com.dms.user.User;
// Used to resolve the uploader's identity from their email address
import com.dms.user.UserRepository;
// Lombok: generates a constructor injecting all final fields (used for Spring DI)
import lombok.RequiredArgsConstructor;
// Lombok: injects an SLF4J logger field named `log` into this class
import lombok.extern.slf4j.Slf4j;
// Allows injecting values from application.properties / environment variables
import org.springframework.beans.factory.annotation.Value;
// Marks this class as a Spring-managed service bean (business logic layer)
import org.springframework.stereotype.Service;
// Represents a file uploaded via HTTP multipart/form-data request
import org.springframework.web.multipart.MultipartFile;

// Standard Java File I/O for directory existence checks
import java.io.File;
// Checked exception thrown by file read/write operations
import java.io.IOException;
// Used to read magic bytes from the uploaded file's binary stream
import java.io.InputStream;
// Utility for creating directories and copying file streams
import java.nio.file.Files;
// Represents a filesystem path in a platform-independent way
import java.nio.file.Path;
// Factory for constructing Path instances from string segments
import java.nio.file.Paths;
// Instructs Files.copy to overwrite any existing file at the destination
import java.nio.file.StandardCopyOption;
// General-purpose collections: List, Map, Set, LinkedHashMap, UUID
import java.util.*;
// Used to transform a Stream of Media entities into a List of MediaDTOs
import java.util.stream.Collectors;

// @Slf4j injects a static `log` logger — enables structured logging of uploads and errors
@Slf4j
// @Service registers this class as a Spring service bean; allows @Autowired injection elsewhere
@Service
// @RequiredArgsConstructor generates a constructor for all `final` fields, enabling Spring constructor injection
@RequiredArgsConstructor
public class MediaService {

    // Maximum permitted upload size: 20 MB — prevents DoS via oversized incident attachments
    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

    // Whitelist of allowed MIME types — only images and videos are permitted for incident evidence
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "image/jpeg", "image/jpg", "image/png", "image/gif",
        "image/webp", "image/bmp", "image/tiff",
        "video/mp4", "video/quicktime", "video/x-msvideo",
        "video/x-matroska", "video/webm", "video/mpeg"
    );

    // Maps each supported MIME type to its expected binary magic byte signature
    // LinkedHashMap preserves insertion order, which matters for sequential checks
    private static final Map<String, byte[]> MAGIC_BYTES = new LinkedHashMap<>();
    static {
        // JPEG files always begin with FF D8 FF
        MAGIC_BYTES.put("image/jpeg",      new byte[]{(byte)0xFF, (byte)0xD8, (byte)0xFF});
        // PNG files begin with the 4-byte PNG signature 89 50 4E 47
        MAGIC_BYTES.put("image/png",       new byte[]{(byte)0x89, 0x50, 0x4E, 0x47});
        // GIF files begin with ASCII "GIF8"
        MAGIC_BYTES.put("image/gif",       new byte[]{0x47, 0x49, 0x46, 0x38});
        // WebP files use the RIFF container — first 4 bytes are "RIFF"
        MAGIC_BYTES.put("image/webp",      new byte[]{0x52, 0x49, 0x46, 0x46}); // RIFF header
        // BMP files begin with ASCII "BM"
        MAGIC_BYTES.put("image/bmp",       new byte[]{0x42, 0x4D});
        // MP4 files embed an "ftyp" ISO base media file format box at byte offset 4
        MAGIC_BYTES.put("video/mp4",       new byte[]{0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70}); // ftyp box
        // QuickTime MOV files share the ftyp box structure with a slightly different size field
        MAGIC_BYTES.put("video/quicktime", new byte[]{0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70});
    }

    // Blocklist of file extensions that could be executed on a server or client — must never be uploaded
    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of(
        "exe", "bat", "cmd", "sh", "php", "js", "html", "htm",
        "vbs", "ps1", "jar", "war", "class", "py", "rb", "pl",
        "asp", "aspx", "jsp", "cgi", "dll", "so", "scr", "msi"
    );

    // Repository for persisting and querying Media records linked to incidents
    private final MediaRepository mediaRepository;
    // Repository for fetching the Incident entity that the uploaded file will be attached to
    private final IncidentRepository incidentRepository;
    // Repository for resolving the authenticated user who is performing the upload
    private final UserRepository userRepository;

    // Upload directory path, configurable via app.file-upload-dir in application.properties
    // Defaults to "uploads/" relative to the application working directory
    @Value("${app.file-upload-dir:uploads/}")
    private String uploadDir;

    /**
     * Uploads a media file (image or video) and associates it with a DMS incident.
     *
     * The file is validated for size, MIME type, extension, and binary magic bytes
     * before being written to disk. A UUID-prefixed filename prevents collisions and
     * enumeration attacks. The resulting Media record links the file to both the
     * incident and the uploading user for audit purposes.
     *
     * @param incidentId the ID of the incident this media evidence belongs to
     * @param file       the multipart file uploaded by the client (responder or citizen)
     * @param email      the email of the authenticated user performing the upload
     * @return a MediaDTO representing the saved media record, including its URL
     * @throws IOException if the file cannot be written to disk
     */
    public MediaDTO uploadMedia(Long incidentId, MultipartFile file, String email) throws IOException {
        // Run all security and content-type validations before touching the filesystem
        validateFile(file);

        // Fetch the incident this media is being attached to; 404 if it doesn't exist
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found"));
        // Resolve the uploader's user entity from their authenticated email address
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Ensure the upload directory exists on disk before attempting to write
        File dir = new File(uploadDir);
        if (!dir.exists()) {
            // mkdirs() creates all intermediate directories as needed
            dir.mkdirs();
        }

        // Sanitize the original filename to strip path separators and special characters
        String safeOriginalName = sanitizeFileName(file.getOriginalFilename());
        // Prepend a UUID to guarantee uniqueness even when multiple users upload identically named files
        String fileName = UUID.randomUUID().toString() + "_" + safeOriginalName;
        // Resolve the absolute, normalized upload directory path to anchor path traversal checks
        Path uploadDirAbs = Paths.get(uploadDir).toAbsolutePath().normalize();
        // Build the full destination path and normalize to collapse any ".." segments
        Path filePath = uploadDirAbs.resolve(fileName).normalize();

        // Verify resolved path is still inside upload dir (prevent path traversal)
        // An attacker crafting a filename like "../../etc/passwd" would escape uploadDirAbs
        if (!filePath.startsWith(uploadDirAbs)) {
            throw new BadRequestException("Invalid file path");
        }

        // Write the uploaded file bytes to disk; REPLACE_EXISTING avoids failure on UUID collision
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Construct the public-facing URL served by the static file handler or reverse proxy
        String url = "/uploads/" + fileName;

        // Build and persist the Media entity, linking it to the incident and the uploading user
        Media media = Media.builder()
                .fileName(fileName)           // stored filename (UUID-prefixed, sanitized)
                .fileType(file.getContentType()) // MIME type as declared by the client
                .fileSize(file.getSize())        // byte size, stored for display and quota tracking
                .url(url)                        // relative URL for frontend retrieval
                .incident(incident)              // links this evidence to a specific DMS incident
                .uploadedBy(user)                // audit trail: who uploaded this file
                .build();

        // Log the successful upload for operational monitoring and audit trails
        log.info("Media uploaded: {} for incident {} by {}", fileName, incidentId, email);
        // Persist the entity and return the DTO representation to the controller
        return MediaDTO.fromEntity(mediaRepository.save(media));
    }

    /**
     * Retrieves all media files attached to a specific incident.
     *
     * Used by the incident detail view to display photo/video evidence submitted
     * by responders and citizens during a disaster event.
     *
     * @param incidentId the ID of the incident whose media attachments are requested
     * @return a list of MediaDTOs representing all associated media files
     */
    public List<MediaDTO> getMediaForIncident(Long incidentId) {
        // Query media records by incident ID, then map each entity to its DTO for the API response
        return mediaRepository.findByIncident_IncidentId(incidentId).stream()
                .map(MediaDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Validates an uploaded file for security and content requirements.
     *
     * Enforces size limits, blocks dangerous extensions, restricts MIME types to
     * images and videos, and confirms the file's binary magic bytes match the
     * declared content type to prevent MIME spoofing attacks.
     *
     * @param file the multipart file to validate
     * @throws IOException        if the file's input stream cannot be read
     * @throws BadRequestException if any validation rule is violated
     */
    private void validateFile(MultipartFile file) throws IOException {
        // Reject null or zero-byte files immediately — nothing to process
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty or missing");
        }
        // Reject files that exceed the 20 MB limit to protect storage and bandwidth
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File size exceeds the maximum allowed size of 20 MB");
        }

        // The original filename is required to extract and validate the file extension
        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            throw new BadRequestException("File name is missing");
        }

        // Extract the lowercase extension and block any known executable types
        String extension = getExtension(originalName).toLowerCase();
        if (DANGEROUS_EXTENSIONS.contains(extension)) {
            // Attackers may try to upload PHP/JSP scripts or executables disguised with dual extensions
            throw new BadRequestException("File type '" + extension + "' is not allowed for security reasons");
        }

        // Check the MIME type declared by the HTTP client against the permitted whitelist
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            // Only image and video evidence is accepted for incident documentation
            throw new BadRequestException("File type '" + contentType + "' is not allowed. Only images and videos are accepted.");
        }

        // Magic bytes check — prevent MIME spoofing
        // Read the first 12 bytes of the file to inspect its binary signature
        byte[] header = new byte[12];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(header);
            // A valid media file must have at least 4 bytes for a meaningful signature
            if (read < 4) {
                throw new BadRequestException("File appears to be empty or corrupted");
            }
        }
        // Compare the binary header against known magic byte patterns for the declared MIME type
        verifyMagicBytes(contentType, header, originalName);
    }

    /**
     * Verifies that a file's binary magic bytes match its declared MIME type.
     *
     * This guards against MIME spoofing, where an attacker renames a malicious file
     * (e.g., a PHP shell) with a .jpg extension and sets Content-Type: image/jpeg.
     * For videos, we instead detect and reject Windows PE and Linux ELF executables.
     *
     * @param contentType the MIME type declared by the HTTP client
     * @param header      the first 12 bytes read from the uploaded file
     * @param fileName    the original filename, used in error messages
     * @throws BadRequestException if the binary signature does not match the declared type
     */
    private void verifyMagicBytes(String contentType, byte[] header, String fileName) {
        // JPEG: validate the FF D8 FF signature at the start of every JPEG file
        if (contentType.contains("jpeg") || contentType.contains("jpg")) {
            if (!startsWith(header, MAGIC_BYTES.get("image/jpeg"))) {
                throw new BadRequestException("File '" + fileName + "' does not appear to be a valid JPEG image");
            }
            return;
        }
        // PNG: validate the 89 50 4E 47 (PNG) signature
        if (contentType.contains("png")) {
            if (!startsWith(header, MAGIC_BYTES.get("image/png"))) {
                throw new BadRequestException("File '" + fileName + "' does not appear to be a valid PNG image");
            }
            return;
        }
        // GIF: validate the "GIF8" ASCII signature (covers GIF87a and GIF89a)
        if (contentType.contains("gif")) {
            if (!startsWith(header, MAGIC_BYTES.get("image/gif"))) {
                throw new BadRequestException("File '" + fileName + "' does not appear to be a valid GIF image");
            }
            return;
        }
        // WebP (RIFF header): the first four bytes spell "RIFF" in ASCII
        if (contentType.contains("webp")) {
            if (!startsWith(header, MAGIC_BYTES.get("image/webp"))) {
                throw new BadRequestException("File '" + fileName + "' does not appear to be a valid WebP image");
            }
            return;
        }
        // BMP: validate the "BM" ASCII marker at the start of every BMP file
        if (contentType.contains("bmp")) {
            if (!startsWith(header, MAGIC_BYTES.get("image/bmp"))) {
                throw new BadRequestException("File '" + fileName + "' does not appear to be a valid BMP image");
            }
            return;
        }
        // Videos — just check not an executable; exact magic varies widely
        if (contentType.startsWith("video/")) {
            // Reject if it looks like a PE executable (Windows) or ELF (Linux)
            // PE (Windows executable): magic bytes 4D 5A ("MZ")
            // ELF (Linux executable): magic bytes 7F 45 4C 46 (DEL "ELF")
            if ((header[0] == 0x4D && header[1] == 0x5A) || // MZ / PE
                (header[0] == 0x7F && header[1] == 0x45 && header[2] == 0x4C && header[3] == 0x46)) { // ELF
                throw new BadRequestException("File '" + fileName + "' appears to be an executable, not a video");
            }
        }
    }

    /**
     * Checks whether a byte array starts with a given prefix sequence.
     *
     * Used by magic byte verification to compare the binary header of an uploaded
     * file against the expected signature for its declared MIME type.
     *
     * @param data   the byte array to inspect (file header bytes)
     * @param prefix the expected magic byte prefix for a given format
     * @return true if `data` starts with all bytes in `prefix`, false otherwise
     */
    private boolean startsWith(byte[] data, byte[] prefix) {
        // The file header must be at least as long as the prefix to match
        if (data.length < prefix.length) return false;
        // Compare each byte of the prefix against the corresponding file header byte
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) return false;
        }
        return true;
    }

    /**
     * Extracts the file extension from a filename.
     *
     * Used to check the extension against the dangerous extension blocklist
     * before the file is processed or stored.
     *
     * @param fileName the original filename (e.g., "incident_photo.jpg")
     * @return the lowercase extension string (e.g., "jpg"), or empty string if none
     */
    private String getExtension(String fileName) {
        // Find the position of the last dot to isolate the extension segment
        int dot = fileName.lastIndexOf('.');
        // Return everything after the last dot, or an empty string if no dot is present
        return dot >= 0 ? fileName.substring(dot + 1) : "";
    }

    /**
     * Sanitizes an uploaded filename to prevent directory traversal and injection attacks.
     *
     * Strips all characters except alphanumerics, dots, dashes, and underscores.
     * Removes leading dots to prevent hidden file creation. Truncates to 100 characters
     * to avoid excessively long filenames that could cause filesystem issues.
     *
     * @param originalName the raw filename as provided by the uploading client
     * @return a safe, filesystem-friendly filename suitable for use in the upload directory
     */
    private String sanitizeFileName(String originalName) {
        // Fall back to a generic name if the client provides no filename
        if (originalName == null) return "upload";
        // Replace any character that is not alphanumeric, dot, dash, or underscore with an underscore
        // This blocks path separators (/ \), null bytes, and other injection characters
        String safe = originalName.replaceAll("[^a-zA-Z0-9._\\-]", "_");
        // Remove leading dots (hidden files)
        // Files like ".htaccess" or ".bashrc" could interfere with server configuration
        safe = safe.replaceAll("^\\.+", "");
        // Truncate to 100 chars to prevent filesystem path length issues
        // Take the trailing 100 characters to preserve the extension
        if (safe.length() > 100) safe = safe.substring(safe.length() - 100);
        // If sanitization results in a blank name, fall back to a safe default
        return safe.isBlank() ? "upload" : safe;
    }
}