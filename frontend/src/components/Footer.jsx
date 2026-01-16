import React from "react";
import { MailCheck } from "lucide-react";

const Footer = () => {
  return (
    <footer className=" text-white py-4 mt-5">
      <div className="container">
        <div className="row justfy-center footer">
          <div className="col-md-12 about_section p-0 text-center">
            <p className="text-white ovr mt-3 mb-2 ">
              Your journey matters. Reach out anytime
            </p>
            <a href="mailto:study.aura.ai@gmail.com">
              <h2 className="grad_text mb-5">study.aura.ai@gmail.com</h2>
            </a>
          </div>
        </div>
        <p className="text-center mb-0">
          &copy; {new Date().getFullYear()} Aura. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
