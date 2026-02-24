package com.devicely.devicely.controller;

import com.devicely.devicely.model.entity.Preview;
import com.devicely.devicely.service.PreviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/previews")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Critical for Frontend-Backend communication
public class PreviewController {

    private final PreviewService previewService;

    @PostMapping
    public ResponseEntity<Preview> savePreview(@RequestBody Preview preview) {
        return ResponseEntity.ok(previewService.savePreview(preview));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<Preview>> getHistory(@PathVariable String userId) {
        return ResponseEntity.ok(previewService.getUserHistory(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePreview(@PathVariable Long id) {
        previewService.deletePreview(id);
        return ResponseEntity.noContent().build();
    }
}