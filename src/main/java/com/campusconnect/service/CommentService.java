package com.campusconnect.service;

import com.campusconnect.dto.CommentRequest;
import com.campusconnect.entity.Comment;
import com.campusconnect.entity.Complaint;
import com.campusconnect.entity.Role;
import com.campusconnect.entity.User;
import com.campusconnect.repository.CommentRepository;
import com.campusconnect.repository.ComplaintRepository;
import com.campusconnect.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import com.campusconnect.exception.ResourceNotFoundException;

import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    public CommentService(
            CommentRepository commentRepository,
            ComplaintRepository complaintRepository,
            UserRepository userRepository) {

        this.commentRepository = commentRepository;
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
    }

    public Comment addComment(
            Long complaintId,
            CommentRequest request,
            String email) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Complaint not found"));
        ensureCanAccessConversation(user, complaint);

        Comment comment = new Comment();

        comment.setMessage(request.getMessage());
        comment.setUser(user);
        comment.setComplaint(complaint);

        return commentRepository.save(comment);
    }

    public List<Comment> getComments(Long complaintId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));
        ensureCanAccessConversation(user, complaint);

        return commentRepository
                .findByComplaintIdOrderByCreatedAtAsc(complaintId);
    }

    private void ensureCanAccessConversation(User user, Complaint complaint) {
        boolean isAdmin = user.getRole() == Role.ADMIN;
        boolean isOwner = user.getId().equals(complaint.getUser().getId());
        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException(
                    "You can only access conversations for your own complaints");
        }
    }
}
