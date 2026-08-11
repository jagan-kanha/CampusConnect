package com.campusconnect.controller;

import com.campusconnect.dto.ComplaintResponse;
import com.campusconnect.dto.StatusUpdateRequest;
import com.campusconnect.entity.Complaint;
import com.campusconnect.entity.ComplaintCategory;
import com.campusconnect.entity.ComplaintPriority;
import com.campusconnect.entity.ComplaintStatus;
import com.campusconnect.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/complaints")
public class AdminComplaintController {

    private final ComplaintService complaintService;

    public AdminComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<ComplaintResponse>> getAllComplaints(

            @RequestParam(required = false)
            ComplaintStatus status,

            @RequestParam(required = false)
            ComplaintPriority priority,

            @RequestParam(required = false)
            ComplaintCategory category,

            Pageable pageable) {

        Page<Complaint> complaints =
                complaintService.getAllComplaints(
                        status,
                        priority,
                        category,
                        pageable
                );

        return ResponseEntity.ok(
                complaints.map(this::toResponse)
        );
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ComplaintResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request) {

        Complaint complaint = complaintService.updateStatus(
                id,
                request.getStatus()
        );

        return ResponseEntity.ok(
                toResponse(complaint)
        );
    }

    private ComplaintResponse toResponse(Complaint complaint) {

        return new ComplaintResponse(
                complaint.getId(),
                complaint.getTitle(),
                complaint.getDescription(),
                complaint.getCategory(),
                complaint.getPriority(),
                complaint.getStatus(),
                complaint.getCreatedAt(),
                complaint.getUpdatedAt(),
                complaint.getUser().getId()
        );
    }
}