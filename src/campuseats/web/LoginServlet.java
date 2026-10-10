package campuseats.web;

import campuseats.backend.UserDAO;
import java.io.IOException;
import java.io.PrintWriter;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

/**
 * Handles login. Mapped to /login in WEB-INF/web.xml.
 *
 * JDBC:  doPost() -> UserDAO.validateLogin() ->
 *        DatabaseConnection.getConnection() ->
 *        DriverManager.getConnection("jdbc:sqlite:...") using the
 *        sqlite-jdbc driver (org.sqlite.JDBC).
 *
 * SESSION: on a successful login an HttpSession is CREATED HERE with
 *        request.getSession(true) and the username is stored in it.
 *        Every other servlet reads that same session to know who is
 *        logged in.
 */
public class LoginServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        renderForm(resp, null);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        String username = req.getParameter("username");
        String password = req.getParameter("password");

        if (new UserDAO().validateLogin(username, password)) {
            // ---- SESSION IS CREATED HERE ----
            HttpSession session = req.getSession(true);
            session.setAttribute("username", username.trim());
            session.setMaxInactiveInterval(30 * 60); // 30 minutes
            resp.sendRedirect(req.getContextPath() + "/menu");
        } else {
            renderForm(resp, "Invalid username or password.");
        }
    }

    private void renderForm(HttpServletResponse resp, String error) throws IOException {
        resp.setContentType("text/html;charset=UTF-8");
        try (PrintWriter out = resp.getWriter()) {
            out.println("<!DOCTYPE html><html><head><title>CampusEats - Login</title></head><body>");
            out.println("<h1>CampusEats - Login</h1>");
            if (error != null) out.println("<p style='color:red'>" + error + "</p>");
            out.println("<form method='post' action='login'>");
            out.println("Username: <input name='username'><br><br>");
            out.println("Password: <input type='password' name='password'><br><br>");
            out.println("<button type='submit'>Login</button>");
            out.println("</form>");
            out.println("<p>Demo accounts: admin / admin123 &nbsp;|&nbsp; student / 1234</p>");
            out.println("</body></html>");
        }
    }
}
