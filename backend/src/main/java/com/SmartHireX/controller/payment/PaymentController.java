package com.SmartHireX.controller.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.SmartHireX.entity.Payment;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.PaymentRepository;
import com.SmartHireX.security.CurrentUser;
import com.SmartHireX.security.UserPrincipal;
import com.SmartHireX.service.UserService;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentRepository paymentRepository;
    private final UserService userService;

    public PaymentController(PaymentRepository paymentRepository, UserService userService) {
        this.paymentRepository = paymentRepository;
        this.userService = userService;
    }

    @PostMapping("/mark-paid")
    public ResponseEntity<?> markPaid(@RequestBody Map<String, Object> payload,
                                      @CurrentUser UserPrincipal principal) {
        try {
            Object amtObj = payload.get("amount");
            if (amtObj == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "amount is required"));
            }
            BigDecimal amount;
            try {
                amount = new BigDecimal(String.valueOf(amtObj));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("message", "invalid amount"));
            }
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "amount must be > 0"));
            }

            User user = userService.findById(principal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Payment p = new Payment();
            p.setUser(user);
            p.setAmount(amount);
            // Mark as manual QR payment; reuse orderId field as reference string
            p.setOrderId("MANUAL-QR-" + System.currentTimeMillis());
            // Optional transaction id from user input (store in paymentId)
            Object txn = payload.get("transactionId");
            if (txn != null) {
                String txnStr = String.valueOf(txn).trim();
                if (!txnStr.isEmpty()) {
                    p.setPaymentId(txnStr);
                }
            }
            Payment saved = paymentRepository.save(p);

            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Payment recorded; pending verification");
            resp.put("id", saved.getId());
            resp.put("orderId", saved.getOrderId());
            resp.put("paymentId", saved.getPaymentId());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            log.error("Failed to mark payment as paid", e);
            return ResponseEntity.status(500).body(Map.of("message", "Internal server error"));
        }
    }
}
