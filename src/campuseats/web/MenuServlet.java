package campuseats.web;

import campuseats.database.DatabaseConnection;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

/**
 * Shows the food menu. Mapped to /menu in WEB-INF/web.xml.
 *
 * SESSION: doGet() reads the EXISTING session with
 *        request.getSession(false). If there is no session (or no
 *        "username" attribute in it) the user is sent back to /login.
 *
 * JDBC:  the menu rows are read straight from SQLite through
 *        DatabaseConnection.getConnection() (DriverManager + sqlite-jdbc).
 */
public class MenuServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        // ---- SESSION IS READ HERE (false = do NOT create a new one) ----
        HttpSession session = req.getSession(false);
        String username = (session == null) ? null : (String) session.getAttribute("username");
        if (username == null) {
            resp.sendRedirect(req.getContextPath() + "/login");
            return;
        }

        resp.setContentType("text/html;charset=UTF-8");
        try (PrintWriter out = resp.getWriter()) {
            out.println("<!DOCTYPE html><html><head><title>CampusEats - Menu</title></head><body>");
            out.println("<h1>Welcome, " + escape(username) + "!</h1>");
            out.println("<p><a href='logout'>Logout</a></p>");
            out.println("<h2>Menu</h2>");
            out.println("<table border='1' cellpadding='8'>");
            out.println("<tr><th>Item</th><th>Price (Rs)</th><th>Order</th></tr>");

            // ---- JDBC QUERY HAPPENS HERE ----
            try (Connection c = DatabaseConnection.getConnection();
                 Statement st = c.createStatement();
                 ResultSet rs = st.executeQuery("SELECT id, name, price FROM menu_items ORDER BY id")) {
                while (rs.next()) {
                    int id = rs.getInt("id");
                    String name = rs.getString("name");
                    int price = rs.getInt("price");
                    out.println("<tr><td>" + escape(name) + "</td><td>" + price + "</td><td>"
                            + "<form method='post' action='order' style='margin:0'>"
                            + "<input type='hidden' name='item_id' value='" + id + "'>"
                            + "Qty: <input name='qty' value='1' size='2'>"
                            + "<button type='submit'>Order</button></form></td></tr>");
                }
            } catch (Exception e) {
                out.println("<tr><td colspan='3'>Menu unavailable: " + escape(e.getMessage()) + "</td></tr>");
            }

            out.println("</table></body></html>");
        }
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
