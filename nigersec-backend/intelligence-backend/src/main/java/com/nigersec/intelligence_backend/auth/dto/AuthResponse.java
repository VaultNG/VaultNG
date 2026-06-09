package com.nigersec.intelligence_backend.auth.dto;

import com.nigersec.intelligence_backend.auth.entity.UserRole;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data @Builder
public class AuthResponse {
    private UUID userId;
    private String email;
    private UserRole role;
    private String accessToken;
    private String refreshToken;
    private long expiresIn;
}
