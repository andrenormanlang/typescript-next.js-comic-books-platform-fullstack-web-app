import { Box } from "@chakra-ui/react";
import { createServerClient} from "../../../lib/supabase-server";
import PasswordForm from "./password-form";

export default async function UpdatePassword() {
  const supabase = await createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return(
  <Box display="flex" alignItems="center" justifyContent="center">
  <PasswordForm user={session?.user} />
  </Box>)
}

// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>Reset Your Password</title>
//   <link href="https://fonts.googleapis.com/css2?family=Bangers&display=swap" rel="stylesheet">
//   <style>
//     body {
//       font-family: Arial, sans-serif;
//       background-color: #f4f4f4;
//       margin: 0;
//       padding: 0;
//       -webkit-font-smoothing: antialiased;
//       -webkit-text-size-adjust: none;
//       width: 100%;
//       height: 100%;
//     }
//     .email-container {
//       max-width: 600px;
//       margin: 0 auto;
//       background-color: #ffffff;
//       border-radius: 10px;
//       overflow: hidden;
//       box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
//     }
//     .header {
//       background-color: #be2525;
//       color: #fff;
//       padding: 20px;
//       text-align: center;
//     }
//     .header img {
//       max-width: 100px;
//       margin-bottom: 10px;
//     }
//     .content {
//       padding: 20px;
//       color: #333;
//     }
//     h1 {
//       font-size: 2rem;
//       color: #ffffff; /* Set font color to white */
//       font-family: 'Bangers', cursive;
//       letter-spacing: 2px; /* Adjust the spacing between letters */
//     }
//     .content h2 {
//       color: #e74c3c;
//       font-family: 'Bangers', cursive;
//     }
//     .content p {
//       font-size: 16px;
//       line-height: 1.6;
//       font-family: Arial, sans-serif;
//     }
//     .content a {
//       color: #3498db;
//       text-decoration: none;
//       font-weight: bold;
//     }
//     .content a:hover {
//       text-decoration: underline;
//     }
//     .footer {
//       background-color: #333;
//       color: #fff;
//       padding: 20px;
//       text-align: center;
//       font-size: 14px;
//     }
//     .footer a {
//       color: #3498db;
//       text-decoration: none;
//     }
//     .footer a:hover {
//       text-decoration: underline;
//     }
//   </style>
// </head>
// <body>
//   <div class="email-container">
//     <div class="header">

//       <h1 style="color: #ffffff; font-family: 'Bangers', cursive; letter-spacing: 2px;">Reset Your RetroPop Password</h1>
//     </div>
//     <div class="content">
//       <h2>Hello RetroPop Collector,</h2>
//       <p>We heard you need to reset your password. No worries, we’ve got you covered! Click the link below to reset your password and get back to your comic adventures:</p>
//       <p><a href="{{ .ConfirmationURL }}">Reset Your Password</a></p>
//       <p>The RetroPop Team</p>
//     </div>
//     <div class="footer">
//       <p>Check out my portfolio<a href="https://anl-portfolio.vercel.app/"> ANL</a></p>
//     </div>
//   </div>
// </body>
// </html>
