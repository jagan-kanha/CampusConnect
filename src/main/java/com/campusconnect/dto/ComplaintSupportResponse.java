package com.campusconnect.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ComplaintSupportResponse {
    private long supportCount;
    private boolean supportedByMe;
}
