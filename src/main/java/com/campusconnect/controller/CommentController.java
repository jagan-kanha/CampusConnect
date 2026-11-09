package com.campusconnect.controller;

import com.campusconnect.dto.CommentRequest;
import com.campusconnect.dto.CommentResponse;
import com.campusconnect.entity.Comment;
import com.campusconnect.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping("/{complaintId}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable Long complaintId,
            @Valid @RequestBody CommentRequest request,
            Authentication authentication) {

        String email = authentication.getName();

        Comment comment = commentService.addComment(
                complaintId,
                request,
                email
        );

        return ResponseEntity.ok(
                toResponse(comment)
        );
    }

    @GetMapping("/{complaintId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable Long complaintId) {

        List<Comment> comments =
                commentService.getComments(complaintId);

        return ResponseEntity.ok(
                comments.stream()
                        .map(this::toResponse)
                        .toList()
        );
    }

    private CommentResponse toResponse(Comment comment) {

        return new CommentResponse(
                comment.getId(),
                comment.getMessage(),
                comment.getCreatedAt(),
                comment.getUser().getId(),
                comment.getComplaint().getId(),
                comment.getUser().getRole().name()
        );
    }
}
