package com.nigersec.intelligence_backend.fraud.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
public class TransactionScoreRequest {

    @NotBlank(message = "Transaction ID is required")
    private String transactionId;

    @NotBlank(message = "Sender account is required")
    private String senderAccount;      // hashed server-side before scoring

    @NotBlank(message = "Receiver account is required")
    private String receiverAccount;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    private String currency = "NGN";

    private String senderBvnHash;      // optional - pre-hashed by caller

    private String deviceFingerprint;

    private String ipAddress;

    private Instant transactionTime;

    private String channel;            // USSD | MOBILE | WEB | POS | TRANSFER
}
