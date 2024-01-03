import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './OnBoarding.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons';

function OnBoarding() {
  const { userID } = useParams();
  const navigate = useNavigate();
  const [screen, setScreen] = useState(1);
  const [fade, setFade] = useState(true);

  const renderProgressBar = () => {
    return (
      <div className="progress-bar">
        <img src="/Assets/onboarding_1.png" alt="Step 1" className={screen === 1 ? 'active' : ''} />
        <img src="/Assets/onboarding_2.png" alt="Step 2" className={screen === 2 ? 'active' : ''} />
        <img src="/Assets/onboarding_3.png" alt="Step 3" className={screen === 3 ? 'active' : ''} />
        <img src="/Assets/onboarding_4.png" alt="Step 4" className={screen === 4 ? 'active' : ''} />
      </div>
    );
  };

  const nextScreen = () => {
    setFade(false);

    setTimeout(() => {
      setScreen(screen => (screen === 4 ? 1 : screen + 1));
      setFade(true);
    }, 500);
  };

  useEffect(() => {
    setFade(true);
  }, []);

  const [screenText, setScreenText] = useState('🌟 Your Personalized Engagement Hub \n\nStep into a world where your dashboard becomes the nerve center of connection. Watch your community interactions come alive, tailored by a system that learns to speak in your voice.');
  const [selectedButton, setSelectedButton] = useState(1);
  const updateScreenText = (newText, buttonNumber) => {
    setScreenText(newText);
    setSelectedButton(buttonNumber);
  };

  const [showSkipText, setShowSkipText] = useState(false);
  const [skipPressed, setSkipPressed] = useState(false);
  const handleTwitterConnect = () => {
    window.location.href = `${window.location.origin}/login/twitter`;
  };

  useEffect(() => { 
    const isTwitterLoginSuccess = () => {
      const urlSearchParams = new URLSearchParams(window.location.search);
      const twitterLoginSuccess = urlSearchParams.get('twitter_login_success');
      return twitterLoginSuccess === 'true';
    };
    if (isTwitterLoginSuccess() === true) {
      setScreen(3);
    }
  }, []);
  
  const [bio, setBio] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
  
    try {
      const response = await axios.post('/setup', { 
        bio: bio,
      });
  
      if (response.status === 200) {
        console.log('Bio sent successfully');
      } else {
        console.log('Failed to send bio');
      }
    } catch (error) {
      console.error('Error:', error);
      console.log('Failed to send bio');
    }
  };
  
  
  const renderScreen = () => {
    return (
      <div className={`content-onb ${fade ? 'fade-in' : 'fade-out'}`}>
        {(() => {
          switch (screen) {
            case 1:
              return (
              <>
              <div className='content-onb'>
                <h1><span style={{ color: 'white' }}>Introducing</span> <span style={{ color: 'red' }}>SuperpowerDM</span></h1>
                  <div className="text-container">
                    <p>{screenText}</p>
                    {selectedButton === 6 && (
                        <button className='nextButton' onClick={nextScreen}>
                          Next ➡
                        </button>
                      )}
                  </div>
                  
                  <div>
                    <div className="button-container">
                      <button 
                        className={`onboarding-button ${selectedButton === 1 ? 'selected' : ''}`} 
                        onClick={() => updateScreenText('🌟 Your Personalized Engagement Hub\n\nStep into a world where your dashboard becomes the nerve center of connection. Watch your community interactions come alive, tailored by a system that learns to speak in your voice.', 1)}
                      >
                      </button>
                      <button 
                        className={`onboarding-button ${selectedButton === 2 ? 'selected' : ''}`} 
                        onClick={() => updateScreenText('🤖 AI-Powered Drafts, Uniquely You\n\nSuperpowerDM isnt just smart; its intuitive. Our advanced language model trains to match your unique communication style, drafting replies that sound authentically you.', 2)}
                      >
                      </button>
                      <button 
                        className={`onboarding-button ${selectedButton === 3 ? 'selected' : ''}`} 
                        onClick={() => updateScreenText('🎨 Crafted Replies, Curated by You\n\nYour voice, your rules. Set the tone and let SuperpowerDM propose responses that echo your personal touch. Review, tweak, and send messages that truly represent your brand.', 3)}
                      >
                      </button>
                      <button 
                        className={`onboarding-button ${selectedButton === 4 ? 'selected' : ''}`} 
                        onClick={() => updateScreenText('👥 Engage with Precision\n\nTarget the comments that align with your brands vision. Whether its a heartfelt thank you or a witty reply to a question, your drafts are ready for your magic touch.', 4)}
                      >
                      </button>
                      <button 
                        className={`onboarding-button ${selectedButton === 5 ? 'selected' : ''}`} 
                        onClick={() => updateScreenText('🛠️ Tailor Your Engagement Strategy\n\nCustomize the criteria for your automated replies—whether its engaging your most loyal followers or acknowledging the early birds. Your SuperpowerDM learns and adapts to your preferences.', 5)}
                      >
                      </button>
                      <button 
                        className={`onboarding-button ${selectedButton === 6 ? 'selected' : ''}`} 
                        onClick={() => updateScreenText('🌱 Nurture Your Digital Ecosystem\n\nYour content is the seed of your community. With SuperpowerDM, you have the power to cultivate lasting relationships, one personalized message at a time.', 6)}
                      >
                      </button>
                    </div>
                  </div>
                </div>
              </>
            );
            case 2:
              return (
                <div className='content-onb'>
                  <h1>Connect X Account</h1>
                  <div className={`skip-text ${showSkipText ? 'show' : ''}`}>
                    <p>Linking your X account allows SuperpowerDM to draft messages that truly sound like you - which is where the magic happens. This step is optional but it’s key for precision and authenticity in your replies and DMs.</p>
                  </div>
                  <div className="button-container2">
                    <button className="connect-button" onClick={handleTwitterConnect}>
                      <FontAwesomeIcon icon={faXTwitter} />
                      Connect X
                    </button>
                    <button 
                      className="skip-button" 
                      onClick={() => {
                        if (!skipPressed) {
                          setShowSkipText(true);
                          setSkipPressed(true);
                        } else {
                          nextScreen();
                        }
                      }}
                    >
                      Skip Now
                    </button>
                  </div>
                </div>
              );
            case 3:
              return (
                <>
                  <div className='bio-content'>
                    <h1>Tell us about yourself</h1>
                    <div className="text-container2">
                      <p>Please type in or paste your current social media bio below. This helps SuperpowerDM grasp the essence of your online persona, ensuring the messages we draft resonate with your unique voice and style.</p>
                    </div>
                    <form onSubmit={handleSubmit}>
                      <textarea 
                        className="bio-input" 
                        placeholder="Enter your bio here..." 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                      />
                      <div className="button-row2">
                        <p className="tip-text">Tip: The more authentic your bio, the better SuperpowerDM can mirror your communication style. This information is kept private and is solely used to enhance your messaging experience.</p>
                        <div className="button-container3">
                          <button className="submit-button" type="submit" onClick={nextScreen}>Submit</button>
                          <button className="skip-button" type="button" onClick={nextScreen}>Skip step</button>
                        </div>
                      </div>
                    </form>
                  </div>
                </>
              ); 
            case 4:
              return (
                <>
                  <div className='content2'>
                    <h1>Using SuperpowerDM - Quick Guide</h1>
                    <iframe style={{margin: 'auto', alignSelf: 'center', display: 'block', borderRadius: '10px', borderColor: '#D37200'}}
                      width="525" 
                      height="315" 
                      src="https://www.youtube.com/embed/xvFZjo5PgG0?si=7w50y5F2Xx7wJk0h" 
                      title="YouTube video player" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share">
                    </iframe>
                    <button className='submit-button' onClick={() => {
                      navigate(`/home`);
                    }}>
                      Go to Dashboard
                    </button>
                  </div>
                </>
              );  
            default:
              return null;
          }
        })()}
      </div>
    );
  };

  return (
    <div className="onboarding">
      {renderProgressBar()}
      <div className={`content-onb ${fade ? 'fade-in' : 'fade-out'}`}>
      {renderScreen(screen)}
      </div>
      <img className='bottom-img' src="/Assets/blackFullLogo.png" alt="Superpower Logo" />
    </div>
  );
}

export default OnBoarding;