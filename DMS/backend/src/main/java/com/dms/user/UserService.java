package com.dms.user;

import com.dms.exception.BadRequestException;
import com.dms.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserDTO getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return UserDTO.fromEntity(user);
    }

    @Transactional
    public UserDTO updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl());
        return UserDTO.fromEntity(userRepository.save(user));
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return UserDTO.fromEntity(user);
    }

    private static final Set<String> VALID_ROLES = Set.of("ADMIN", "CITIZEN", "RESCUE_TEAM");

    @Transactional
    public UserDTO updateUserRole(Long id, String role) {
        if (role == null || role.isBlank()) {
            throw new BadRequestException("Role is required");
        }
        String normalizedRole = role.toUpperCase().replace("ROLE_", "");
        if (!VALID_ROLES.contains(normalizedRole)) {
            throw new BadRequestException("Invalid role. Must be one of: ADMIN, CITIZEN, RESCUE_TEAM");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setRoles(new HashSet<>(Collections.singleton(normalizedRole)));
        return UserDTO.fromEntity(userRepository.save(user));
    }

    @Transactional
    public UserDTO toggleUserActive(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        user.setActive(!user.getActive());
        return UserDTO.fromEntity(userRepository.save(user));
    }

    @Transactional
    public void updateAvatar(String email, String avatarUrl) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);
    }
}
