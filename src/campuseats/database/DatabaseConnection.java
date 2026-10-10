package campuseats.database;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class DatabaseConnection {
    private static final String URL = "jdbc:sqlite:database/campuseats.db";

    /** Returns a live connection, or null if no driver/DB is available (never throws). */
    public static Connection getConnection() {
        try {
            new File("database").mkdirs();
            return DriverManager.getConnection(URL);
        } catch (Exception e) {
            return null;
        }
    }

    /** Creates the tables and seeds demo users + menu. Safe to call even if no DB driver exists. */
    public static void initialize() {
        try (Connection c = getConnection()) {
            if (c == null) return;
            try (Statement st = c.createStatement()) {
                st.execute("CREATE TABLE IF NOT EXISTS users(username TEXT PRIMARY KEY, password TEXT NOT NULL)");
                st.execute("INSERT OR IGNORE INTO users VALUES('admin','admin123')");
                st.execute("INSERT OR IGNORE INTO users VALUES('student','1234')");
                st.execute("CREATE TABLE IF NOT EXISTS menu_items(id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL)");
                st.execute("INSERT OR IGNORE INTO menu_items VALUES(1,'Classic Veg Burger',120)");
                st.execute("INSERT OR IGNORE INTO menu_items VALUES(2,'Chicken Burger',150)");
                st.execute("INSERT OR IGNORE INTO menu_items VALUES(3,'Crispy Fries',80)");
                st.execute("INSERT OR IGNORE INTO menu_items VALUES(4,'Chocolate Shake',110)");
                st.execute("INSERT OR IGNORE INTO menu_items VALUES(5,'Margherita Pizza',180)");
                st.execute("INSERT OR IGNORE INTO menu_items VALUES(6,'Masala Maggi',60)");
                st.execute("CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, item_id INTEGER NOT NULL, item_name TEXT NOT NULL, qty INTEGER NOT NULL, total INTEGER NOT NULL, placed_at TEXT NOT NULL DEFAULT (datetime('now','localtime')))");
            }
        } catch (Exception ignored) {
            // mock layer in UserDAO will handle logins
        }
    }

    public static boolean isAvailable() {
        try (Connection c = getConnection()) {
            return c != null;
        } catch (Exception e) {
            return false;
        }
    }
}