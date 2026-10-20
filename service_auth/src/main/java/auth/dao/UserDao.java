package auth.dao;

import auth.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class UserDao {
    private final NamedParameterJdbcTemplate jdbc;

    private UserEntity mapRow(ResultSet resultSet, int rowNum) throws SQLException {
        return UserEntity.builder()
                .id(resultSet.getObject("id", UUID.class))
                .email(resultSet.getString("email"))
                .firstName(resultSet.getString("first_name"))
                .lastName(resultSet.getString("last_name"))
                .phoneNumber(resultSet.getString("phone_number"))
                .password(resultSet.getString("password"))
                .build();
    }

    public UUID createUser(UserEntity user) {
        UUID id = UUID.randomUUID();
        String sql = """
                INSERT INTO users (id, email, first_name, last_name,
                                   phone_number, password)
                VALUES (:id, :email, :firstName, :lastName,
                        :phone, :password)
                """;
        jdbc.update(sql, new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("email", user.getEmail())
                .addValue("firstName", user.getFirstName())
                .addValue("lastName", user.getLastName())
                .addValue("phone", user.getPhoneNumber())
                .addValue("password", user.getPassword()));
        return id;
    }

    public void updatePassword(UUID userId, String newPassword) {
        String sql = """
                UPDATE users
                SET password = :password
                WHERE id = :id
                """;
        jdbc.update(sql, new MapSqlParameterSource()
                .addValue("id", userId)
                .addValue("password", newPassword));
    }
    public Optional<UserEntity> findById(UUID id) {
        String sql = "SELECT * FROM users WHERE id = :id";
        return jdbc.query(sql, new MapSqlParameterSource("id", id), this::mapRow)
                .stream().findFirst();
    }

    public Optional<UserEntity> findByEmail(String email) {
        String sql = "SELECT * FROM users WHERE email = :email";
        return jdbc.query(sql, new MapSqlParameterSource("email", email), this::mapRow)
                .stream().findFirst();
    }

    public boolean existsByEmail(String email) {
        String sql = "SELECT COUNT(*) FROM users WHERE email = :email";
        Integer count = jdbc.queryForObject(sql,
                new MapSqlParameterSource("email", email), Integer.class);
        return count != null && count > 0;
    }
}
