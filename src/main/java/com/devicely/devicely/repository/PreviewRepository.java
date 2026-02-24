package com.devicely.devicely.repository;

import com.devicely.devicely.model.entity.Preview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PreviewRepository extends JpaRepository<Preview, Long> {
    List<Preview> findByUserIdOrderByCreatedAtDesc(String userId);
}