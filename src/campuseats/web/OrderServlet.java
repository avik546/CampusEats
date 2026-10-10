package campuseats.web;

import campuseats.database.DatabaseConnection;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

/**
 * Places an order. Mapped to /order in WEB-INF/web.xml.
 *
 * SESSION: the logged-in username is taken from the existing HttpSession.
 *
 * JDBC:  the order is INSERTed into the SQLite "orders" table through
 *        DatabaseConnection.getConnection() (DriverManager + sqlite-jdbc).
 */
public class OrderServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        // ---- SESSION IS READ HERE ----
        HttpSession session = req.getSession(false);
        String username = (session == null) ? null : (String) session.getAttribute("username");
        if (username == null) {
            resp.sendRedirect(req.getContextPath() + "/login");
            return;
        }

        int itemId = parseInt(req.getParameter("item_id"));
        int qty = Math.max(1, parseInt(req.getParameter("qty")));
        String message;

        // ---- JDBC INSERT HAPPENS HERE ----
        try (Connection c = DatabaseConnection.getConnection();
             PreparedStatement item = c.prepareStatement("SELECT name, price FROM menu_items WHERE id=?")) {
            item.setInt(1, itemId);
            try (ResultSet rs = item.executeQuery()) {
                if (rs.next()) {
                    String name = rs.getString("name");
                    int total = rs.getInt("price") * qty;
                    try (PreparedStatement ins = c.prepareStatement(
                            "INSERT INTO orders(username, item_id, item_name, qty, total) VALUES(?,?,?,?,?)")) {
                        ins.setString(1, username);
                        ins.setInt(2, itemId);
                        ins.setString(3, name);
                        ins.setInt(4, qty);
                        ins.setInt(5, total);
                        ins.executeUpdate();
                    }
                    message = "Order placed: " + qty + " x " + name + " = Rs " + total;
                } else {
                    message = "Unknown menu item.";
                }
            }
        } catch (Exception e) {
            message = "Could not place order: " + e.getMessage();
        }

        resp.setContentType("text/html;charset=UTF-8");
        try (PrintWriter out = resp.getWriter()) {
            out.println("<!DOCTYPE html><html><head><title>CampusEats - Order</title></head><body>");
            out.println("<h1>" + message.replace("<", "&lt;") + "</h1>");
            out.println("<p><a href='menu'>Back to menu</a> | <a href='logout'>Logout</a></p>");
            out.println("</body></html>");
        }
    }

    private static int parseInt(String s) {
        try {
            return Integer.parseInt(s);
        } catch (Exception e) {
            return 0;
        }
    }
}
