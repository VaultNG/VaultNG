package com.nigersec.intelligence_backend.auth.service;

import com.nigersec.intelligence_backend.auth.dto.*;
import com.nigersec.intelligence_backend.auth.entity.RefreshToken;
import com.nigersec.intelligence_backend.auth.entity.User;
import com.nigersec.intelligence_backend.auth.repository.RefreshTokenRepository;
import com.nigersec.intelligence_backend.auth.repository.UserRepository;
import com.nigersec.intelligence_backend.common.exception.NigerSecException;
import com.nigersec.intelligence_backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${nigersec.jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    @Value("${nigersec.jwt.expiration-ms}")
    private long accessExpirationMs;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw NigerSecException.conflict("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .institutionId(request.getInstitutionId())
                .enabled(true)
                .build();

        user = userRepository.save(user);
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> NigerSecException.unauthorized("Invalid credentials"));

        if (!user.isEnabled()) {
            throw NigerSecException.unauthorized("Account disabled");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw NigerSecException.unauthorized("Invalid credentials");
        }

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> NigerSecException.unauthorized("Invalid refresh token"));

        if (refreshToken.isRevoked() || refreshToken.getExpiresAt().isBefore(Instant.now())) {
            throw NigerSecException.unauthorized("Refresh token expired or revoked");
        }

        return buildAuthResponse(refreshToken.getUser());
    }

    @Transactional
    public void logout(String email) {
        userRepository.findByEmail(email).ifPresent(refreshTokenRepository::revokeAllByUser);
    }

    private AuthResponse buildAuthResponse(User user) {
        // Revoke old tokens and issue fresh ones
        refreshTokenRepository.revokeAllByUser(user);

        String accessToken  = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        String refreshToken = UUID.randomUUID().toString();

        refreshTokenRepository.save(RefreshToken.builder()
                .token(refreshToken)
                .user(user)
                .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
                .revoked(false)
                .build());

        return AuthResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(accessExpirationMs / 1000)
                .build();
    }
}
