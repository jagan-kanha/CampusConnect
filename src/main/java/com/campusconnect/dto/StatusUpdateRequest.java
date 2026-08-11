package com.campusconnect.dto;

import com.campusconnect.entity.ComplaintStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StatusUpdateRequest {

    @NotNull(message = "Status is required")
    private ComplaintStatus status;
}