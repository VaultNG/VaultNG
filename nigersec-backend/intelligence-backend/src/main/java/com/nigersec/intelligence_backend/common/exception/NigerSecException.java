package com.nigersec.intelligence_backend.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class NigerSecException extends RuntimeException {

    private final HttpStatus status;

    public NigerSecException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public static NigerSecException notFound(String message) {
        return new NigerSecException(message, HttpStatus.NOT_FOUND);
    }

    public static NigerSecException badRequest(String message) {
        return new NigerSecException(message, HttpStatus.BAD_REQUEST);
    }

    public static NigerSecException conflict(String message) {
        return new NigerSecException(message, HttpStatus.CONFLICT);
    }

    public static NigerSecException unauthorized(String message) {
        return new NigerSecException(message, HttpStatus.UNAUTHORIZED);
    }

    public static NigerSecException forbidden(String message) {
        return new NigerSecException(message, HttpStatus.FORBIDDEN);
    }
}
