package com.travel.AI_travel_planner.service;

import com.travel.AI_travel_planner.entity.User;
import com.travel.AI_travel_planner.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            BCryptPasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new IllegalArgumentException(
                    "이미 사용 중인 아이디입니다."
            );
        }

        user.setPassword(
                passwordEncoder.encode(user.getPassword())
        );

        return userRepository.save(user);
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public User findByUsername(String username) {
        return userRepository
                .findByUsername(username)
                .orElse(null);
    }

    public User login(
            String username,
            String rawPassword
    ) {
        Optional<User> optionalUser =
                userRepository.findByUsername(username);

        if (optionalUser.isEmpty()) {
            return null;
        }

        User user = optionalUser.get();

        if (!passwordEncoder.matches(
                rawPassword,
                user.getPassword()
        )) {
            return null;
        }

        return user;
    }

    public User updateProfile(
            Integer userId,
            String name,
            String email
    ) {
        User user = userRepository
                .findById(userId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "사용자를 찾을 수 없습니다."
                        )
                );

        user.setName(name);
        user.setEmail(email);

        return userRepository.save(user);
    }

    public boolean changePassword(
            Integer userId,
            String currentPassword,
            String newPassword
    ) {
        User user = userRepository
                .findById(userId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "사용자를 찾을 수 없습니다."
                        )
                );

        if (!passwordEncoder.matches(
                currentPassword,
                user.getPassword()
        )) {
            return false;
        }

        user.setPassword(
                passwordEncoder.encode(newPassword)
        );

        userRepository.save(user);
        return true;
    }

    @Transactional
    public void deleteUser(Integer userId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException(
                    "사용자를 찾을 수 없습니다."
            );
        }

        userRepository.deleteById(userId);
    }
}