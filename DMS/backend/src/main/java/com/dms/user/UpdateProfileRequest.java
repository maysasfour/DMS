package com.dms.user;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(min = 1, max = 50, message = "First name must be between 1 and 50 characters")
    private String firstName;

    @Size(min = 1, max = 50, message = "Last name must be between 1 and 50 characters")
    private String lastName;

    @Pattern(
        regexp = "^\\+?[\\d\\s\\-()]{0,20}$",
        message = "Phone number format is invalid"
    )
    private String phoneNumber;

    @Size(max = 500, message = "Bio must not exceed 500 characters")
    private String bio;

    // Avatar URL is set server-side after upload; not accepted from client directly
    private String avatarUrl;
}
