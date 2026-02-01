import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AuraVisual3D from "../components/AuraVisual3D";
import cta from "../assets/recall_cta.webp";
import aryan from "../assets/aryan.webp";
import faruq from "../assets/faruq.webp";

const Developers = () => {
  return (
    <div className="home-container">
      <Header />
      <div className="container">
        <div className="hero">
          <div className="row">
            <div className="col-md-12">
              <div className="hero_content text-center">
                <div className="d-flex justify-content-center align-items-center mb-3">
                  <AuraVisual3D />
                </div>
                <h1 className="grad_text">Meet the Team</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* developer */}
      <div className="container pc">
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-12 text-center about_section p-0">
            <h3 className="grad_text"> Developers</h3>
            <h2 className="mb-2 mt-2">Group Name: TechAssasin</h2>
          </div>
        </div>

      

        <div className="row g-4 justify-content-center">
          {/* Developer 1 */}
          <div className="col-md-4">
            <div className="ft_box dev_box">
              <img src={faruq} alt="developer" className="img-fluid rbc" />
              <h4>HETVI LAD</h4>
              <p>
                Email:{" "}
                <a href="mailto:hlad.2317@gmail.com">
                  <span className="grad_text">
                    hlad.2317@gmail.com
                  </span>
                </a>
              </p>
            </div>
          </div>

          {/* Developer 2 */}
          <div className="col-md-4">
            <div className="ft_box dev_box">
              <img src={aryan} alt="aura_logo" className="img-fluid rbc" />
              <h4>ARYAN SONDHARVA</h4>
              <p>
                Email:{" "}
                <a href="mailto:aryansondharva25@gmail.com">
                  <span className="grad_text">
                    aryansondharva25@gmail.com
                  </span>
                </a>
              </p>
            </div>
          </div>

          {/* Developer 3 */}
          <div className="col-md-4">
            <div className="ft_box dev_box">
              <img src={faruq} alt="aura_logo" className="img-fluid rbc" />
              <h4>SHREY KANSARA</h4>
              <p>
                Email:{" "}
                <a href="mailto:shrey7829@gmail.com">
                  <span className="grad_text">
                  shrey7829@gmail.com
                  </span>
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* cta */}
      <div className="container pc" id="cta">
        <div className="row text-center">
          <img
            src={cta}
            alt="aura_logo"
            className="img-fluid rbc rbc2 rbc3"
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Developers;
