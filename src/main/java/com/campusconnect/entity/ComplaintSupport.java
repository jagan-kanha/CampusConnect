package com.campusconnect.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "complaint_supports",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_complaint_support_user",
                columnNames = {"complaint_id", "user_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
public class ComplaintSupport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public ComplaintSupport(Complaint complaint, User user) {
        this.complaint = complaint;
        this.user = user;
    }
}
