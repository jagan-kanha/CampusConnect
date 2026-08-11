package com.campusconnect.repository;

import com.campusconnect.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintRepository
        extends JpaRepository<Complaint, Long> {

    Page<Complaint> findByUserId(Long userId, Pageable pageable);

    Page<Complaint> findByStatus(
            ComplaintStatus status,
            Pageable pageable);

    Page<Complaint> findByPriority(
            ComplaintPriority priority,
            Pageable pageable);

    Page<Complaint> findByCategory(
            ComplaintCategory category,
            Pageable pageable);
}