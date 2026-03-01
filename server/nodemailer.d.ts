declare module "nodemailer" {
  interface SendMailOptions {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    inReplyTo?: string;
    references?: string[];
  }

  interface Transporter {
    sendMail(mailOptions: SendMailOptions): Promise<{ messageId: string }>;
  }

  function createTransport(config: {
    service?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  }): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
