package campuseats.backend;

import campuseats.database.DatabaseConnection;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

public class UserDAO {
    private static final Map<String, String> MOCK_USERS = new HashMap<>();
    static {
        MOCK_USERS.put("admin", "admin123");
        MOCK_USERS.put("student", "1234");
        DatabaseConnection.initialize(); // create + seed SQLite tables on first use
    }

    public boolean validateLogin(String username, String password) {
        if (username == null || password == null || username.trim().isEmpty()) return false;
        try (Connection c = DatabaseConnection.getConnection()) {
            if (c != null) {
                try (PreparedStatement ps = c.prepareStatement(
                        "SELECT 1 FROM users WHERE username=? AND password=?")) {
                    ps.setString(1, username);
                    ps.setString(2, password);
                    try (ResultSet rs = ps.executeQuery()) {
                        return rs.next();
                    }
                }
            }
        } catch (Exception ignored) {
            // fall through to mock layer
        }
        return password.equals(MOCK_USERS.get(username));
    }
}