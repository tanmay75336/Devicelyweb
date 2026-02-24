package com.devicely.devicely.service;

import com.devicely.devicely.model.entity.Preview;
import com.devicely.devicely.repository.PreviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PreviewService {

    private final PreviewRepository repository;

    // Requirement: Save Preview (POST)
    public Preview savePreview(Preview preview) {
        return repository.save(preview);
    }

    // Requirement: Get Previews by User (GET) sorted by most recent
    public List<Preview> getUserHistory(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // Optional Requirement: Delete Preview
    public void deletePreview(Long id) {
        repository.deleteById(id);
    }
}