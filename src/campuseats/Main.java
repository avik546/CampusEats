package campuseats;

import java.awt.Desktop;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

public class Main {
    public static void main(String[] args) throws Exception {
        Path root = findProjectRoot();
        int port = Integer.parseInt(System.getProperty("campuseats.port", "3000"));
        if (port < 1 || port > 65535) throw new IllegalArgumentException("Invalid web server port.");
        URI address = URI.create("http://localhost:" + port + "/");
        System.out.println("CampusEats Web (Local) - " + root);
        System.out.println("Open " + address + " in your browser.");
        if (isReady(port)) {
            System.out.println("The connected web app is already running.");
            openBrowser(address);
            return;
        }

        Properties settings = new Properties();
        Path privateSettings = root.resolve("nbproject/private/private.properties");
        if (Files.isRegularFile(privateSettings)) {
            try (InputStream input = Files.newInputStream(privateSettings)) { settings.load(input); }
        }
        String node = settings.getProperty("node.executable", "node");
        ProcessBuilder builder = new ProcessBuilder(node, root.resolve("server.js").toString());
        builder.directory(root.toFile());
        builder.environment().put("PORT", Integer.toString(port));
        builder.inheritIO();
        final Process server = builder.start();
        Thread shutdown = new Thread(() -> server.destroy(), "campuseats-server-stop");
        Runtime.getRuntime().addShutdownHook(shutdown);
        try {
            boolean ready = false;
            for (int attempt = 0; attempt < 100 && server.isAlive(); attempt++) {
                if (isReady(port)) { ready = true; break; }
                Thread.sleep(100);
            }
            if (!ready) {
                server.destroy();
                throw new IllegalStateException("Web app could not start. Check the Node.js messages above and whether port " + port + " is occupied.");
            }
            openBrowser(address);
            System.out.println("Keep this run active. Stop it when you finish using CampusEats.");
            int exit = server.waitFor();
            if (exit != 0) throw new IllegalStateException("Web server stopped with exit code " + exit);
        } finally {
            server.destroy();
            Runtime.getRuntime().removeShutdownHook(shutdown);
        }
    }

    private static Path findProjectRoot() throws Exception {
        Path[] candidates = {
            Paths.get(System.getProperty("campuseats.home", System.getProperty("user.dir"))),
            Paths.get(Main.class.getProtectionDomain().getCodeSource().getLocation().toURI())
        };
        for (Path candidate : candidates) {
            for (Path current = candidate.toAbsolutePath(); current != null; current = current.getParent()) {
                if (Files.isRegularFile(current.resolve("server.js")) && Files.isDirectory(current.resolve("public"))) return current;
            }
        }
        throw new IllegalStateException("Open the CampusEats Web (Local) project from C:\\Users\\LOQ\\OneDrive\\Desktop\\project\\CampusEats. This launcher needs server.js and public/ beside the project.");
    }

    private static boolean isReady(int port) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) URI.create("http://127.0.0.1:" + port + "/api/health").toURL().openConnection();
            connection.setConnectTimeout(200);
            connection.setReadTimeout(200);
            if (connection.getResponseCode() != 200) return false;
            byte[] bytes = new byte[512];
            try (InputStream input = connection.getInputStream()) {
                StringBuilder result = new StringBuilder();
                int length;
                while ((length = input.read(bytes)) != -1) result.append(new String(bytes, 0, length, StandardCharsets.UTF_8));
                return result.toString().contains("\"database\":\"connected\"");
            }
        } catch (Exception ignored) { return false; }
        finally { if (connection != null) connection.disconnect(); }
    }

    private static void openBrowser(URI address) {
        if ("false".equals(System.getProperty("campuseats.browser"))) return;
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) Desktop.getDesktop().browse(address);
        } catch (Exception error) {
            System.out.println("Open the browser manually at " + address);
        }
    }
}
