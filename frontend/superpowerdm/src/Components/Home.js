import React, { useState } from 'react';
import CardComponent from './cards.js';
import './Home.css';
import './Assets/toggle-switch.css';
import './Assets/tooltip.css';
import './Assets/cards.css';

function YourNewPage() {
  const [currentScreen, setCurrentScreen] = useState(1);
  const [fade, setFade] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [mobilePosition, moveMobilePosition] = useState(false);
  const [mobileButton, setMobileButton] = useState('≡');
  const contentClass = expanded ? 'content-expanded' : 'content-collapsed';

  const changeScreen = (newScreen) => {
    setTimeout(() => {
      setCurrentScreen(newScreen);
    }, 100); 
  };

  const mobilePositionChange = () => {
    moveMobilePosition(!mobilePosition);
    setMobileButton(mobileButton === "≡" ? "✖" : "≡");
  }
    
  const renderScreen = () => {
    switch (currentScreen) {
      case 1:
        return (
          <div className='content'>
            <div className='content-header'>
              <h2>Dashboard</h2>
            </div>
          </div>
        );        
      case 2:
        return (
          <div className='content'>
            <div className='content-header'>
              <h2>Control Center</h2>
            </div>
            <CardComponent />
          </div>
        );
        case 3:
        return (
          <div className='content'>
            <div className='content-header'>
              <h2>Settings</h2>
            </div>
          </div>
        );
        case 4:
        return (
          <div className='content'>
            <div className='content-header'>
              <h2>Coming Soon!</h2>
            </div>
          </div>
        );
      default:
        return <div>Something went wrong!</div>;
    }
  };

  return (
    <div className="Background">
      <div className={contentClass}>
        {renderScreen()}
      </div>
      <button onClick={() => {
          setExpanded(!expanded);
          mobilePositionChange();
        }} 
        className={`mobile-only-button ${mobilePosition ? 'newMobilePosition' : ''}`}>
        {mobileButton}
      </button>
      <div className={`sidebar ${expanded ? 'expanded' : ''}`} 
           onMouseEnter={() => setExpanded(true)} 
           onMouseLeave={() => setExpanded(false)} >
        {expanded ? (
          <>
            <div>
              <img src="/Assets/colourFullLogo.png" alt="Logo" className='side-logo' />
            </div>
            <button onClick={() => changeScreen(1)} className={`sidebar-button ${currentScreen === 1 ? 'active' : ''}`}> 
              <img src="/Assets/SideButton.png" alt="Icon" className="button-icon" />
              Dashboard
            </button>
            <button onClick={() => changeScreen(2)} className={`sidebar-button ${currentScreen === 2 ? 'active' : ''}`}>
              <img src="/Assets/SideButton.png" alt="Icon" className="button-icon" />
              Control Centre
            </button>
            <button onClick={() => changeScreen(4)} className={`sidebar-button ${currentScreen === 4 ? 'active' : ''}`}>
              <img src="/Assets/SideButton.png" alt="Icon" className="button-icon" />
              Campaigns (~Coming Soon!)
            </button>
            <button onClick={() => changeScreen(4)} className={`sidebar-button ${currentScreen === 4 ? 'active' : ''}`}>
              <img src="/Assets/SideButton.png" alt="Icon" className="button-icon" />
              Audiences (~Coming Soon!)
            </button>
            <button onClick={() => changeScreen(3)} className="button-settings"> 
              <img src="/Assets/SettingsIcon.png" alt="Icon" className="button-icon" />
              Settings
            </button>
          </>
        ) : (
          <>
            <div>
              <img src="/Assets/redIcon.png" alt="Logo" className='side-logo-closed' />
            </div>
            <button onClick={() => changeScreen(1)} className={`sidebar-button ${currentScreen === 1 ? 'active' : ''}`}>
              <img src="/Assets/SideButton.png" alt="Icon" className="button-icon" />
            </button>
            <button onClick={() => changeScreen(2)} className={`sidebar-button ${currentScreen === 2 ? 'active' : ''}`}>
              <img src="/Assets/SideButton.png" alt="Icon" className="button-icon" />
            </button>
            <button onClick={() => changeScreen(4)} className={`sidebar-button ${currentScreen === 4 ? 'active' : ''}`}>
              <img src="/Assets/SideButton.png" alt="Icon" className="button-icon" />
            </button>
            <button onClick={() => changeScreen(4)} className={`sidebar-button ${currentScreen === 4 ? 'active' : ''}`}>
              <img src="/Assets/SideButton.png" alt="Icon" className="button-icon" />
            </button>
            <button onClick={() => changeScreen(3)} className="button-settings"> 
              <img src="/Assets/SettingsIcon.png" alt="Icon" className="button-icon" />
            </button>
          </>
        )}
      </div>  
    </div>
  );
}

export default YourNewPage;
