import React, { useState, useEffect } from "react";
import recalloLogo from "../assets/recallo.png";
import { EqualApproximately } from "lucide-react";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleNavbar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const closeNavbar = () => {
    setIsCollapsed(false);
  };

  return (
    <header className={`header ${isScrolled ? "scrolled" : ""}`}>
      <nav className="navbar navbar-expand-lg">
        <div className="container-fluid">
          <a className="navbar-brand" href="/">
            <img
              src={recalloLogo}
              alt="recallo_logo logo"
              className="img-fluid logo"
              
            />
          </a>
          <button className="navbar-toggler ms-auto" type="button" onClick={toggleNavbar}>
            <span className="navbar-toggler-menu">
              <EqualApproximately size={30} />
            </span>
          </button>

          <div className={`collapse navbar-collapse ${isCollapsed ? "show" : ""}`}>
            <ul className="navbar-nav ms-auto me-auto mb-2 mb-lg-0" onClick={closeNavbar}>
              <li className="nav-item">
                <a className="nav-link active" aria-current="page" href="/">Home</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#about">About</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/features">Features</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/developers">Developers</a>
              </li>
            </ul>
          </div>

          <div>
            <a href="/signin" className="btn btn-cs header-btn">Get Started</a>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
