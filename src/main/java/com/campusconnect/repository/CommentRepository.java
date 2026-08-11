package com.campusconnect.repository;

import com.campusconnect.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository
        extends JpaRepository<Comment, Long> {

    List<Comment> findByComplaintIdOrderByCreatedAtAsc(Long complaintId);
}