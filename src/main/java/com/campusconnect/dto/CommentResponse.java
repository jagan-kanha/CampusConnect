package com.campusconnect.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class CommentResponse {

    private Long id;
    private String message;
    private LocalDateTime createdAt;
    private Long userId;
    private Long complaintId;
}