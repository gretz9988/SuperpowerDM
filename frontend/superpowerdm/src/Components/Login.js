import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function LoginScreen() {
  const navigate = useNavigate();

  const [showLogin, setShowLogin] = useState(true);
  const [contentClass, setContentClass] = useState('fade-in');
  const [fbLoaded, setFbLoaded] = useState(false);

  const handleLoginClick = () => {
    setContentClass('fade-out');
    setTimeout(() => {
      setShowLogin(false);
      setContentClass('fade-in');
    }, 500);
  };

  useEffect(() => {
    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));

    const checkFB = setInterval(() => {
      if (window.FB) {
        window.FB.init({
          appId: '1079236933072082',
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v18.0',
          config_id  : '289617444052184'
        });

        window.FB.getLoginStatus(function (response) {
          statusChangeCallback(response);
        });

        setFbLoaded(true);
        clearInterval(checkFB);
      }
    }, 1000);

    return () => clearInterval(checkFB);
  }, []);

  const facebookBusinessLogin = () => {
    if (!fbLoaded) {
      console.log('FB SDK not loaded yet.');
      return;
    }

    window.FB.login(function (response) {
      if (response.authResponse) {
        console.log('You are now logged in.');
        var accessToken = response.authResponse.accessToken;
        statusChangeCallback(response, accessToken);
      } else {
        console.log('User cancelled login or did not fully authorize.');
      }
    }, 
    { 
      scope: 'email',
    });
  };

  // send the response to the server
  const sendResponseToServer = (fbResponse, accessToken) => {
    axios.post('/login', { 
      fbResponse: fbResponse, 
      accessToken: accessToken 
    })
    .then(response => {
      const data = response.data;
      if (data.success && data.redirect) {
          // Redirect to the setup page
          window.location.href = data.redirect;
      } else {
          // Handle login failure
          console.error('Login failed:', data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
  };  

  const statusChangeCallback = (response, accessToken) => {
    if (response.status === 'connected') {
      console.log('Welcome! Fetching your information.... ');
      window.FB.api('/me', function (userResponse) {
        console.log('Successful login for: ' + userResponse.name);
        sendResponseToServer(userResponse, accessToken);
      });
    } else {
      console.log('Please log in to Facebook.');
    }
  };

  const facebookLogout = () => {
    if (window.FB) {
      window.FB.logout(function(response) {
        // Handle the response, such as updating the state to reflect the user's logout
        console.log("User logged out of Facebook");
      });
    } else {
      console.log("Facebook SDK not loaded yet.");
    }
  };

  return (
    <div className="outer-container">
      {showLogin ? (
        <div className={`login-screen ${contentClass}`}>
          <img src="Assets/colourFullLogo.png" alt="Logo" className="centered-image" />
          <h2>Helping Creators Maximize Follower-Engagement with AI</h2>
          <button className="login-button" onClick={handleLoginClick}>Log In</button>
          <button className="register-button" onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSdodkpVCh7FBhW4Scf0kHRJmmaBR2dklR2W96kO6MjEFVolrg/viewform', '_blank')}>
            Request Access
          </button>
        </div>
      ) : (
        <div className={`new-content ${contentClass}`}>
          <h1>Welcome</h1>
          <h2>SuperpowerDM is presently only available to invited users. Please click below if you are pre-approved.</h2>
          <div>
            <button onClick={facebookLogout} className="logout-button">
              Log Out of Facebook
            </button>    
          </div>
          {fbLoaded && (
            <button className="fb-login-button" onClick={facebookBusinessLogin}>
              <i className="fab fa-facebook-square"></i> Continue with Facebook
            </button>
          )}
          <img src="Assets/whiteFullLogo.png" alt="Small Image" className="bottom-image" />
        </div>
      )}
    </div>
  );
}

export default LoginScreen;
