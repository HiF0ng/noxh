using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

class BulletproofWebServer
{
    private static string root = @"f:\noxh.help";
    private static int port = 3000;
    private static string logPath = @"f:\noxh.help\server_log.txt";

    static void Log(string msg)
    {
        try
        {
            File.AppendAllText(logPath, string.Format("[{0}] {1}\r\n", DateTime.Now.ToString("HH:mm:ss"), msg));
        }
        catch {}
    }

    static void Main(string[] args)
    {
        AppDomain.CurrentDomain.UnhandledException += (s, e) => {
            Log("CRITICAL UNHANDLED EXCEPTION: " + e.ExceptionObject);
        };

        File.WriteAllText(logPath, "Starting crash-proof server...\r\n");

        Socket serverSocket = null;
        try
        {
            serverSocket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
            serverSocket.Bind(new IPEndPoint(IPAddress.Any, port));
            serverSocket.Listen(100);
            Log("Bound successfully to 0.0.0.0:" + port);
        }
        catch (Exception ex)
        {
            Log("Failed to bind: " + ex.Message);
            return;
        }

        while (true)
        {
            try
            {
                Socket clientSocket = serverSocket.Accept();
                ThreadPool.QueueUserWorkItem(WorkItem, clientSocket);
            }
            catch (Exception ex)
            {
                Log("Accept exception: " + ex.Message);
                Thread.Sleep(100);
            }
        }
    }

    private static void WorkItem(object state)
    {
        Socket socket = state as Socket;
        if (socket == null) return;

        try
        {
            HandleRequest(socket);
        }
        catch (Exception ex)
        {
            Log("WorkItem exception: " + ex.Message);
        }
        finally
        {
            try { socket.Close(); } catch {}
        }
    }

    private static void HandleRequest(Socket socket)
    {
        socket.ReceiveTimeout = 5000;
        socket.SendTimeout = 5000;

        byte[] reqBuffer = new byte[8192];
        int readBytes = 0;
        try
        {
            readBytes = socket.Receive(reqBuffer);
        }
        catch
        {
            return;
        }

        if (readBytes <= 0) return;

        string requestString = Encoding.UTF8.GetString(reqBuffer, 0, readBytes);
        string[] lines = requestString.Split(new string[] { "\r\n", "\n" }, StringSplitOptions.None);
        if (lines.Length == 0) return;

        string[] reqParts = lines[0].Split(' ');
        if (reqParts.Length < 2) return;

        string urlPath = reqParts[1].Split('?')[0];
        if (urlPath == "/") urlPath = "/homepage.html";

        string filePath = Path.Combine(root, urlPath.TrimStart('/').Replace('/', '\\'));

        if (File.Exists(filePath))
        {
            string ext = Path.GetExtension(filePath).ToLower();
            string mime = "text/html; charset=utf-8";
            switch (ext)
            {
                case ".html": mime = "text/html; charset=utf-8"; break;
                case ".css": mime = "text/css; charset=utf-8"; break;
                case ".js": mime = "application/javascript; charset=utf-8"; break;
                case ".png": mime = "image/png"; break;
                case ".jpg": mime = "image/jpeg"; break;
                case ".svg": mime = "image/svg+xml"; break;
                case ".json": mime = "application/json; charset=utf-8"; break;
            }

            byte[] fileBytes = File.ReadAllBytes(filePath);
            byte[] headerBytes = Encoding.UTF8.GetBytes(
                "HTTP/1.1 200 OK\r\n" +
                "Content-Type: " + mime + "\r\n" +
                "Content-Length: " + fileBytes.Length + "\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Connection: close\r\n\r\n"
            );

            socket.Send(headerBytes);
            socket.Send(fileBytes);
            Log("200 OK -> " + urlPath);
        }
        else
        {
            byte[] notFoundBytes = Encoding.UTF8.GetBytes("HTTP/1.1 404 Not Found\r\nContent-Length: 13\r\nConnection: close\r\n\r\n404 Not Found");
            socket.Send(notFoundBytes);
            Log("404 Not Found -> " + urlPath);
        }
    }
}
