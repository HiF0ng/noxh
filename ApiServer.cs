using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Security.Cryptography;

class FullStackApiServer
{
    private static string root = @"f:\noxh.help";
    private static string uploadsDir = @"f:\noxh.help\uploads";
    private static string dbPath = @"f:\noxh.help\database.json";
    private static int port = 3000;
    private static string logPath = @"f:\noxh.help\server_log.txt";
    private static readonly object dbLock = new object();

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
        if (!Directory.Exists(uploadsDir))
        {
            Directory.CreateDirectory(uploadsDir);
        }

        EnsureDatabaseSeeded();

        Log("Starting Full-Stack API & Static Web Server on port " + port + "...");

        Socket serverSocket = null;
        try
        {
            serverSocket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
            serverSocket.Bind(new IPEndPoint(IPAddress.Any, port));
            serverSocket.Listen(100);
            Log("Server listening on 0.0.0.0:" + port);
        }
        catch (Exception ex)
        {
            Log("Failed to bind port: " + ex.Message);
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
                Log("Accept error: " + ex.Message);
                Thread.Sleep(50);
            }
        }
    }

    private static void EnsureDatabaseSeeded()
    {
        lock (dbLock)
        {
            if (File.Exists(dbPath)) return;

            Log("Seeding initial database.json...");

            string dataJsonPath = Path.Combine(root, "data.json");
            string faqsSeed = "[]";

            if (File.Exists(dataJsonPath))
            {
                try
                {
                    string rawData = File.ReadAllText(dataJsonPath, Encoding.UTF8);
                    faqsSeed = ExtractFaqsFromDataJson(rawData);
                }
                catch (Exception ex)
                {
                    Log("Warning seeding FAQs from data.json: " + ex.Message);
                }
            }

            StringBuilder sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine("  \"users\": [");
            sb.AppendLine("    {");
            sb.AppendLine("      \"id\": \"user-admin-1\",");
            sb.AppendLine("      \"email\": \"admin@noxh.help\",");
            sb.AppendLine("      \"passwordHash\": \"386362f5cc9041c2301dff39f0bfab88b06f96d2d4fda335c292f7109055453d\",");
            sb.AppendLine("      \"fullName\": \"Nguyễn Văn A (Admin)\",");
            sb.AppendLine("      \"role\": \"admin\",");
            sb.AppendLine("      \"createdAt\": \"" + DateTime.UtcNow.ToString("o") + "\"");
            sb.AppendLine("    }");
            sb.AppendLine("  ],");
            sb.AppendLine("  \"projects\": [");
            sb.AppendLine("    { \"id\": \"prj-1\", \"title\": \"NHS Trung Văn\", \"location\": \"Nam Từ Liêm, Hà Nội\", \"investor\": \"Công ty Cổ phần Đầu tư Xây dựng NHS\", \"progress\": 85, \"status\": \"Đang mở bán\" },");
            sb.AppendLine("    { \"id\": \"prj-2\", \"title\": \"Udic Ecotrans\", \"location\": \"Hoàng Mai, Hà Nội\", \"investor\": \"Tổng Công ty UDIC\", \"progress\": 60, \"status\": \"Đang xây dựng\" },");
            sb.AppendLine("    { \"id\": \"prj-3\", \"title\": \"Rice City Tố Hữu\", \"location\": \"Hà Đông, Hà Nội\", \"investor\": \"Công ty Cổ phần BIC Việt Nam\", \"progress\": 100, \"status\": \"Bàn giao\" }");
            sb.AppendLine("  ],");
            sb.AppendLine("  \"documents\": [");
            sb.AppendLine("    { \"id\": \"doc-1\", \"title\": \"Mẫu đơn đăng ký mua Nhà ở xã hội (Mẫu số 01)\", \"category\": \"Đơn mua\", \"docType\": \"PDF\", \"fileUrl\": \"/uploads/mau-01-dang-ky-mua-noxh.pdf\", \"content\": \"Mẫu đơn đăng ký mua nhà ở xã hội chuẩn Bộ Xây dựng.\" },");
            sb.AppendLine("    { \"id\": \"doc-2\", \"title\": \"Mẫu giấy xác nhận đối tượng và điều kiện nhà ở (Mẫu số 03)\", \"category\": \"Đơn mua\", \"docType\": \"DOCX\", \"fileUrl\": \"/uploads/mau-03-xac-nhan-dieu-kien.docx\", \"content\": \"Giấy xác nhận thực trạng nhà ở cho người thu nhập thấp.\" },");
            sb.AppendLine("    { \"id\": \"doc-3\", \"title\": \"Mẫu đơn đăng ký thuê Nhà ở xã hội (Mẫu số 02)\", \"category\": \"Đơn thuê\", \"docType\": \"PDF\", \"fileUrl\": \"/uploads/mau-02-dang-ky-thue-noxh.pdf\", \"content\": \"Mẫu đơn chuẩn dành cho đối tượng có nhu cầu thuê NOXH.\" }");
            sb.AppendLine("  ],");
            sb.AppendLine("  \"faqs\": " + faqsSeed + ",");
            sb.AppendLine("  \"news\": [");
            sb.AppendLine("    { \"id\": \"news-1\", \"title\": \"Lãi suất cho vay ưu đãi mua Nhà ở xã hội mới nhất năm 2026\", \"summary\": \"Ngân hàng Chính sách xã hội công bố điều chỉnh mức lãi suất ưu đãi mua NOXH.\", \"content\": \"Nội dung chi tiết về lãi suất ưu đãi...\", \"imageUrl\": \"/img/news-1.jpg\", \"status\": \"published\", \"publishedAt\": \"" + DateTime.UtcNow.ToString("o") + "\" }");
            sb.AppendLine("  ]");
            sb.AppendLine("}");

            File.WriteAllText(dbPath, sb.ToString(), Encoding.UTF8);
            Log("database.json seeded successfully!");
        }
    }

    private static string ExtractFaqsFromDataJson(string rawJson)
    {
        List<string> items = new List<string>();
        int order = 0;
        int categoryIdx = 0;

        while ((categoryIdx = rawJson.IndexOf("\"id\":", categoryIdx)) != -1)
        {
            int idEnd = rawJson.IndexOf(",", categoryIdx);
            if (idEnd == -1) break;
            string catId = rawJson.Substring(categoryIdx, idEnd - categoryIdx).Replace("\"id\":", "").Replace("\"", "").Trim();
            
            int qasStart = rawJson.IndexOf("\"qas\":", categoryIdx);
            if (qasStart == -1) break;
            int qasEnd = rawJson.IndexOf("]", qasStart);
            if (qasEnd == -1) break;

            string qasBlock = rawJson.Substring(qasStart, qasEnd - qasStart);
            int qIdx = 0;
            while ((qIdx = qasBlock.IndexOf("\"q\":", qIdx)) != -1)
            {
                int qEnd = qasBlock.IndexOf("\",", qIdx);
                if (qEnd == -1) break;
                string qText = qasBlock.Substring(qIdx, qEnd - qIdx).Replace("\"q\":", "").Trim().Trim('"');

                int aIdx = qasBlock.IndexOf("\"a\":", qEnd);
                if (aIdx != -1)
                {
                    int aEnd = qasBlock.IndexOf("\"", aIdx + 5);
                    if (aEnd != -1)
                    {
                        string aText = qasBlock.Substring(aIdx + 4, aEnd - (aIdx + 4)).Trim();
                        order++;
                        items.Add(string.Format("{{\"id\":\"faq-{0}\",\"category\":\"{1}\",\"q\":\"{2}\",\"a\":\"{3}\",\"sortOrder\":{0}}}", order, catId, EscapeJson(qText), EscapeJson(aText)));
                    }
                }
                qIdx = qEnd + 2;
            }

            categoryIdx = qasEnd + 1;
        }

        return "[" + string.Join(",", items.ToArray()) + "]";
    }

    private static string EscapeJson(string s)
    {
        return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "\\n");
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
        socket.ReceiveTimeout = 10000;
        socket.SendTimeout = 10000;

        byte[] reqBuffer = new byte[65536];
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

        string httpMethod = reqParts[0].ToUpper();
        string rawUrl = reqParts[1];
        string urlPath = rawUrl.Split('?')[0];

        // API ENDPOINTS
        if (urlPath.StartsWith("/api/v1/"))
        {
            HandleApiRequest(socket, httpMethod, urlPath, rawUrl, lines, requestString);
            return;
        }

        // STATIC FILE SERVER
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
                case ".jpeg": mime = "image/jpeg"; break;
                case ".svg": mime = "image/svg+xml"; break;
                case ".json": mime = "application/json; charset=utf-8"; break;
                case ".pdf": mime = "application/pdf"; break;
                case ".docx": mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; break;
            }

            byte[] fileBytes = File.ReadAllBytes(filePath);
            SendResponse(socket, "200 OK", mime, fileBytes);
            Log("200 OK -> " + urlPath);
        }
        else
        {
            SendResponse(socket, "404 Not Found", "text/plain; charset=utf-8", Encoding.UTF8.GetBytes("404 Not Found"));
            Log("404 Not Found -> " + urlPath);
        }
    }

    private static void HandleApiRequest(Socket socket, string method, string path, string rawUrl, string[] headers, string rawReqStr)
    {
        if (path == "/api/v1/health")
        {
            string json = string.Format("{{\"status\":\"OK\",\"message\":\"NOXH.HELP Full-Stack API Server is running smoothly\",\"timestamp\":\"{0}\"}}", DateTime.UtcNow.ToString("o"));
            SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes(json));
            return;
        }

        if (path == "/api/v1/auth/login" && method == "POST")
        {
            string body = ExtractBody(rawReqStr);
            string email = GetJsonProp(body, "email").ToLower().Trim();
            string password = GetJsonProp(body, "password").Trim();

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                SendResponse(socket, "400 Bad Request", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"error\":\"Vui lòng nhập đầy đủ email và mật khẩu\"}"));
                return;
            }

            string passwordHash = HashSha256(password);
            string token = Convert.ToBase64String(Encoding.UTF8.GetBytes(email + ":" + passwordHash + ":" + DateTime.UtcNow.Ticks));

            string resJson = string.Format("{{\"message\":\"Đăng nhập thành công\",\"token\":\"{0}\",\"user\":{{\"id\":\"user-admin-1\",\"email\":\"{1}\",\"fullName\":\"Nguyễn Văn A (Admin)\",\"role\":\"admin\"}}}}", token, email);
            SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes(resJson));
            return;
        }

        if (path == "/api/v1/auth/me")
        {
            string resJson = "{\"user\":{\"id\":\"user-admin-1\",\"email\":\"admin@noxh.help\",\"fullName\":\"Nguyễn Văn A (Admin)\",\"role\":\"admin\"}}";
            SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes(resJson));
            return;
        }

        if (path == "/api/v1/projects")
        {
            lock (dbLock)
            {
                string dbText = File.ReadAllText(dbPath, Encoding.UTF8);
                int prjStart = dbText.IndexOf("\"projects\":");
                if (prjStart != -1)
                {
                    int arrStart = dbText.IndexOf("[", prjStart);
                    int arrEnd = FindMatchingBracket(dbText, arrStart);
                    string prjJson = dbText.Substring(arrStart, arrEnd - arrStart + 1);
                    SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"projects\":" + prjJson + "}"));
                    return;
                }
            }
            SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"projects\":[]}"));
            return;
        }

        if (path == "/api/v1/documents")
        {
            lock (dbLock)
            {
                string dbText = File.ReadAllText(dbPath, Encoding.UTF8);
                int docStart = dbText.IndexOf("\"documents\":");
                if (docStart != -1)
                {
                    int arrStart = dbText.IndexOf("[", docStart);
                    int arrEnd = FindMatchingBracket(dbText, arrStart);
                    string docJson = dbText.Substring(arrStart, arrEnd - arrStart + 1);
                    SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"documents\":" + docJson + "}"));
                    return;
                }
            }
            SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"documents\":[]}"));
            return;
        }

        if (path == "/api/v1/faqs")
        {
            lock (dbLock)
            {
                string dbText = File.ReadAllText(dbPath, Encoding.UTF8);
                int faqStart = dbText.IndexOf("\"faqs\":");
                if (faqStart != -1)
                {
                    int arrStart = dbText.IndexOf("[", faqStart);
                    int arrEnd = FindMatchingBracket(dbText, arrStart);
                    string faqJson = dbText.Substring(arrStart, arrEnd - arrStart + 1);
                    SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"faqs\":" + faqJson + "}"));
                    return;
                }
            }
            SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"faqs\":[]}"));
            return;
        }

        if (path == "/api/v1/news")
        {
            lock (dbLock)
            {
                string dbText = File.ReadAllText(dbPath, Encoding.UTF8);
                int newsStart = dbText.IndexOf("\"news\":");
                if (newsStart != -1)
                {
                    int arrStart = dbText.IndexOf("[", newsStart);
                    int arrEnd = FindMatchingBracket(dbText, arrStart);
                    string newsJson = dbText.Substring(arrStart, arrEnd - arrStart + 1);
                    SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"news\":" + newsJson + "}"));
                    return;
                }
            }
            SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"news\":[]}"));
            return;
        }

        SendResponse(socket, "200 OK", "application/json; charset=utf-8", Encoding.UTF8.GetBytes("{\"status\":\"success\",\"message\":\"API endpoint ready\"}"));
    }

    private static int FindMatchingBracket(string str, int startIdx)
    {
        int depth = 0;
        for (int i = startIdx; i < str.Length; i++)
        {
            if (str[i] == '[') depth++;
            else if (str[i] == ']')
            {
                depth--;
                if (depth == 0) return i;
            }
        }
        return str.Length - 1;
    }

    private static string ExtractBody(string reqStr)
    {
        int idx = reqStr.IndexOf("\r\n\r\n");
        if (idx != -1)
        {
            return reqStr.Substring(idx + 4);
        }
        return "";
    }

    private static string GetJsonProp(string json, string propName)
    {
        string target = "\"" + propName + "\":";
        int idx = json.IndexOf(target);
        if (idx == -1) return "";
        int start = json.IndexOf("\"", idx + target.Length);
        if (start == -1) return "";
        int end = json.IndexOf("\"", start + 1);
        if (end == -1) return "";
        return json.Substring(start + 1, end - start - 1);
    }

    private static string HashSha256(string input)
    {
        using (SHA256 sha = SHA256.Create())
        {
            byte[] bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
            StringBuilder sb = new StringBuilder();
            foreach (byte b in bytes) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }
    }

    private static void SendResponse(Socket socket, string statusCode, string contentType, byte[] body)
    {
        string header = string.Format(
            "HTTP/1.1 {0}\r\n" +
            "Content-Type: {1}\r\n" +
            "Content-Length: {2}\r\n" +
            "Access-Control-Allow-Origin: *\r\n" +
            "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n" +
            "Access-Control-Allow-Headers: Content-Type, Authorization\r\n" +
            "Connection: close\r\n\r\n",
            statusCode, contentType, body.Length
        );

        byte[] headerBytes = Encoding.UTF8.GetBytes(header);
        socket.Send(headerBytes);
        if (body.Length > 0)
        {
            socket.Send(body);
        }
    }
}
