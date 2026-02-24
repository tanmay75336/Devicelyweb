package com.devicely.devicely.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "previews")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Preview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Explicitly mapping to match the SQL query Hibernate is generating
    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "website_url", nullable = false)
    private String websiteUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}