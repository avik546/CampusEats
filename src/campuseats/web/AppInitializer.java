package campuseats.web;

import campuseats.database.DatabaseConnection;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

/**
 * Runs once when the web application starts (declared as a &lt;listener&gt; in
 * WEB-INF/web.xml). Creates the SQLite tables and seeds demo data through the
 * same JDBC path the servlets use: DatabaseConnection -> DriverManager ->
 * sqlite-jdbc (org.sqlite.JDBC).
 */
public class AppInitializer implements ServletContextListener {

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        DatabaseConnection.initialize();
        sce.getServletContext().log("CampusEats: database initialized via JDBC.");
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        // nothing to clean up: SQLite connections are short-lived per request
    }
}
