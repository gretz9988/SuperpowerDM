import React, { useState, useEffect } from 'react';

// THIS CODE IS NOT TO BE USED IN FINAL PRODUCT. IT IS FOR TESTING PURPOSES/POC ONLY AND IS VERY POORLY WRITTEN. 

const defaultData = [];

// -----------------TEST DATA FOR DEVELOPMENT-----------------
// const defaultData = [
//   {
//     id: '1806821234567854',
//     imageUrl: 'https://picsum.photos/id/237/1080/1080',
//     date: '2023-12-09T21:35:36+0000',
//     username: 'user1',
//     comments: [
//       { username: 'commenter1', comment: 'Great post!' },
//       { username: 'commenter2', comment: 'Love this!' }
//     ]
//   },
//   {
//     id: '179887602982372',
//     imageUrl: 'https://picsum.photos/id/7/1080/1920',
//     date: '2023-12-09T21:32:54+0000',
//     username: 'user2',
//     comments: [
//       { username: 'commenter3', comment: 'Amazing content!' },
//       { username: 'commenter4', comment: 'Really nice picture.' }
//     ]
//   },
//   {
//     id: '17901198953067',
//     imageUrl: 'https://picsum.photos/id/63/1080/1080',
//     date: '2023-11-16T14:51:08+0000',
//     username: 'user3',
//     comments: [
//       { username: 'commenter5', comment: 'This is awesome!' }
//     ]
//   },
//   {
//     id: '17987708884506',
//     imageUrl: 'https://picsum.photos/id/16/1080/1920',
//     date: '2023-11-03T16:16:05+0000',
//     username: 'user4',
//     comments: [
//       { username: 'commenter1', comment: 'I like this post a lot.' },
//       { username: 'commenter7', comment: 'Great job!' },
//       { username: 'commenter8', comment: 'Very cool!' }
//     ]
//   },
//   {
//     id: '1823344558749012',
//     imageUrl: 'https://picsum.photos/id/5/1080/1080',
//     date: '2023-10-25T10:30:21+0000',
//     username: 'user5',
//     comments: [
//       { username: 'commenter9', comment: 'Superb!' },
//       { username: 'commenter10', comment: 'Inspiring work.' }
//     ]
//   },
//   {
//     id: '17651127890987654',
//     imageUrl: 'https://picsum.photos/id/59/1080/1080',
//     date: '2023-10-20T08:15:45+0000',
//     username: 'user6',
//     comments: [
//       { username: 'commenter11', comment: 'Fantastic!' },
//       { username: 'commenter12', comment: 'Wow, this is great!' }
//     ]
//   },
//   {
//     id: '176543677654',
//     imageUrl: 'https://picsum.photos/id/59/1080/1080',
//     date: '2023-10-20T08:15:45+0000',
//     username: 'user6',
//     comments: [
//       { username: 'commenter11', comment: 'Fantastic!' },
//       { username: 'commenter12', comment: 'Wow, this is great!' }
//     ]
//   },
// ];

// Needs to be its own component
const LoadingOverlay = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  }}>
    <div style={{ fontSize: '2rem', color: 'white' }}>Loading...</div>
  </div>
);

const CardComponent = ({maxCards}) => {
  const [data, setData] = useState(() => {
    const savedData = localStorage.getItem('defaultData');
    return savedData ? JSON.parse(savedData) : defaultData;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [displayedComments, setDisplayedComments] = useState({});
  const [rejectedComments, setRejectedComments] = useState(() => {
    const savedRejectedComments = localStorage.getItem('rejectedComments');
    return savedRejectedComments ? new Set(JSON.parse(savedRejectedComments)) : new Set();
  });
  const [repliedComments, setRepliedComments] = useState(() => {
    const savedRepliedComments = localStorage.getItem('repliedComments');
    return savedRepliedComments ? new Set(JSON.parse(savedRepliedComments)) : new Set();
  });
  const [activeCard, setActiveCard] = useState(null);

  const initializeCountdown = () => {
    const disabledTime = localStorage.getItem('disabledTime');
    if (disabledTime) {
      const now = new Date().getTime();
      const remainingTime = 300 - Math.floor((now - parseInt(disabledTime)) / 1000);
      return remainingTime > 0 ? remainingTime : 0;
    }
    return 0;
  };

  const [isButtonDisabled, setIsButtonDisabled] = useState(initializeCountdown() > 0);
  const [countdown, setCountdown] = useState(initializeCountdown());

  // All of these need to change to use a new data structure
  useEffect(() => {
    localStorage.setItem('defaultData', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('rejectedComments', JSON.stringify(Array.from(rejectedComments)));
  }, [rejectedComments]);

  useEffect(() => {
    localStorage.setItem('repliedComments', JSON.stringify(Array.from(repliedComments)));
  }, [repliedComments]);

  // Fetch instagram media and comments 
  const fetchMedia = async () => {
    setIsLoading(true);
    setIsButtonDisabled(true);
    try {
      const response = await fetch('/fetch_media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const jsonData = await response.json();
  
      let transformedData = jsonData.map(item => ({
        imageUrl: item.media_url,
        date: item.timestamp,
        id: item.id,
        username: item.username,
        comments: [],
        commentsFetched: false
      }));
  
      setData(transformedData);

      // Refresh comments for each media item
      for (const item of transformedData) {
        await fetchComments(item.id, item.username);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setIsLoading(false);
      setIsButtonDisabled(false);
    }
  };
  
  // Fetch comments for a specific media item
  const fetchComments = async (mediaId, username, isActiveCard = false) => {
    try {
      const response = await fetch('/fetch_comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ media_id: mediaId, username: username })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      let newComments = await response.json();
      newComments = newComments.filter(comment => 
        !rejectedComments.has(comment.id) && !repliedComments.has(comment.id)
      );
      
      //avoid duplicates
      setData(prevData => prevData.map(item => {
        if (item.id === mediaId) {
          const existingCommentIds = new Set(item.comments.map(c => c.id));
          const filteredComments = newComments.filter(comment => !existingCommentIds.has(comment.id));
          return { ...item, comments: [...item.comments, ...filteredComments] };
        }
        return item;
      }));
  
      if (isActiveCard) {
        setActiveCard(prevActiveCard => {
          if (prevActiveCard && prevActiveCard.id === mediaId) {
            return { ...prevActiveCard, comments: newComments };
          }
          return prevActiveCard;
        });
      }
  
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };  
  
// remove rejected comment from the list of comments
  const removeComment = (mediaId, commentToRemove) => {
    setRejectedComments(prev => {
      const newSet = new Set([...prev, commentToRemove.id]);
      localStorage.setItem('rejectedComments', JSON.stringify(Array.from(newSet))); // Save to localStorage
      return newSet;
    });
  
    setData(prevData => prevData.map(item => {
      if (item.id === mediaId) {
        const updatedComments = item.comments.filter(comment => comment.id !== commentToRemove.id);
        return { ...item, comments: updatedComments };
      }
      return item;
    }));
  }; 

  const handleCardButtonClick = async (card) => {
    setIsLoading(true); // Start loading
  
    try {
      if (card.comments && card.comments.length > 0) {
        await submitComments(card.comments);
  
        // After submitComments, find the updated card in your state
        setData(prevData => {
          const updatedData = prevData.map(post => {
            if (post.id === card.id) {
              setActiveCard(post); // Set the updated card as active
              return { ...post };
            }
            return post;
          });
          return updatedData;
        });
      }
    } catch (error) {
      console.error('Error in handleCardButtonClick:', error);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const closeDetailScreen = () => {
    setActiveCard(null);
  };

  // Update the comments with the responses from the server (GPT)
  const updateCommentsWithResponses = (responseData) => {
    setData(prevData => {
      const updatedData = prevData.map(post => ({
        ...post,
        comments: post.comments.map(comment => {
          const responseEntry = responseData.find(response => response.id === comment.id);
          return responseEntry 
            ? { ...comment, response: responseEntry.response }
            : comment;
        })
      }));
      console.log("Updated data with responses:", updatedData);
      return updatedData;
    });
  };
  

  const submitComments = async (comments) => {
    try {
      // Filter out comments that already have a response
      const commentsWithoutResponse = comments.filter(comment => !comment.response);
  
      if (commentsWithoutResponse.length === 0) {
        console.log("No new comments to process");
        return;
      }
  
      // Prepare the payload: include both comment text and id, this is what matches them throughout the process
      const payload = commentsWithoutResponse.map(comment => ({
        id: comment.id,
        comment: comment.comment
      }));
  
      const response = await fetch('/submit_comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const responseData = await response.json();
      updateCommentsWithResponses(responseData);

  
    } catch (error) {
      console.error('Error submitting comments:', error);
    }
  };
  
  
  
  // Check if data is empty, and if so, use defaultData
  const effectiveData = data.length === 0 ? defaultData : data;
  // Determine the number of cards to display
  const numCardsToShow = maxCards || effectiveData.length;
  // Slice the data to limit the number of cards if necessary
  const limitedData = effectiveData.slice(0, numCardsToShow);

  // when a card is clicked, this opens up the detail screen
  const DetailScreen = ({ activeCard, closeDetailScreen, fetchComments, removeComment, rejectedComments }) => {
    const [selectedComment, setSelectedComment] = useState(null);
    const [showFullComment, setShowFullComment] = useState(false);
    const [draftReply, setDraftReply] = useState("");
    const [generatedResponse, setGeneratedResponse] = useState("");
    const isCommentRejected = (comment) => rejectedComments.has(comment.id);

    const selectComment = (comment) => {
      setSelectedComment(comment);
      setShowFullComment(false);
      setDraftReply(comment.response || "");
    };
    
    const refreshComments = async () => {
      if (activeCard) {
        await fetchComments(activeCard.id, activeCard.username);
    
        // After fetching new comments, check if the previously selected comment still exists
        if (selectedComment) {
          const updatedComment = activeCard.comments.find(comment => comment.id === selectedComment.id);
          if (updatedComment) {
            setSelectedComment(updatedComment); // Reselect the comment if it exists
          } else {
            setSelectedComment(null); // Deselect if the comment no longer exists
          }
        }
      }
    };

    const handleShowMore = () => {
      setShowFullComment(true);
    };
  
    const handleDraftChange = (e) => {
      setDraftReply(e.target.value);
    };
  
    const rejectReply = () => {
      if (selectedComment && activeCard) {
        setRejectedComments(prev => new Set([...prev, selectedComment.id]));
        removeComment(activeCard.id, selectedComment);
        setSelectedComment(null); // Reset selected comment
      }
    };    

    const publishReply = async () => {
      console.log("Publishing reply:", draftReply);
    
      if (!selectedComment) {
        console.error("No comment selected");
        return;
      }
    
      // Get the index of the currently selected comment
      const currentCommentIndex = activeCard.comments.findIndex(comment => comment.id === selectedComment.id);
    
      // UI update before server response (optimistic update) (need to add in error handling)
      let optimisticUpdatedComments = [...activeCard.comments];
      optimisticUpdatedComments = optimisticUpdatedComments.filter(comment => comment.id !== selectedComment.id);
    
      setActiveCard({ ...activeCard, comments: optimisticUpdatedComments });
    
      setData(prevData => prevData.map(item => {
        if (item.id === activeCard.id) {
          return { ...item, comments: optimisticUpdatedComments };
        }
        return item;
      }));
    
      const payload = {
        commentId: selectedComment.id,
        reply: draftReply
      };
    
      try {
        const response = await fetch('/publish_reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
    
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`); // TODO: handle error
        }

        const responseData = await response.json();
        console.log("Reply published:", responseData);

        const repliedCommentId = selectedComment.id;
        
        // remember replied to comments, remove from comment list (and TODO, add back into user data for more user context)
        setRepliedComments(prev => {
          const newSet = new Set([...prev, repliedCommentId]);
          localStorage.setItem('repliedComments', JSON.stringify(Array.from(newSet)));
          return newSet;
        });
    
        // Select the next comment if it exists
        const nextComment = optimisticUpdatedComments[currentCommentIndex] || optimisticUpdatedComments[currentCommentIndex - 1] || null;
        setSelectedComment(nextComment);
        setDraftReply(nextComment ? nextComment.response || "" : "");
    
      } catch (error) {
        console.error('Error publishing reply:', error);
        // Revert UI changes if there was an error
        setActiveCard({ ...activeCard, comments: [...activeCard.comments, selectedComment] });
        setData(prevData => prevData.map(item => {
          if (item.id === activeCard.id) {
            return { ...item, comments: [...item.comments, selectedComment] };
          }
          return item;
        }));
        setSelectedComment(selectedComment); // Re-select the original comment
      }
    };
    
    
  
    return (
      <div className="detail-screen">
        <div className="comment-header">
          <h2>Post from {activeCard.date}</h2>
          <div className="post-image-container">
            <img src={activeCard.imageUrl} alt="Post" className="post-image" />
            <div className="post-image-text">Some text next to the image</div>
          </div>
          <div className="comment-info">
            <div className="comment-counter">{activeCard.comments.filter(comment => comment.published).length}/{activeCard.comments.filter(comment => !rejectedComments.has(comment.id)).length} comments replied to
             </div>
            <button className="circle-button" onClick={refreshComments}>
              <img src="/Assets/reload.png" className="reload" alt="Close" />
            </button>
          </div>
          <button className="circle-button" onClick={closeDetailScreen}>X</button>
        </div>
        <div className="content-body">
        <div className="comments-list">
          <h3>Comments</h3>
          {activeCard.comments
          .filter(comment => !isCommentRejected(comment))
            .filter(comment => !rejectedComments.has(comment.id)) // potential error line
            .map((comment, index) => {
            return (
              <div key={index} className={`comment-item ${selectedComment === comment ? 'highlighted' : ''}`}
                  onClick={() => selectComment(comment)}>
                <img src={comment.userImage} alt="User" />
                <div className="comment-username">@{comment.username}</div>
                <div className="separator">| </div>
                <div className="comment-text">{comment.comment}</div>
              </div>
            );
          })}
        </div>
          <div className="comment-detail">
            {selectedComment ? (
                <>
                <div className="comment-detail-header">
                  <img src={selectedComment.userImage} alt="User" className="comment-user-image" />
                  <span>@{selectedComment.username}</span>
                </div>
                <div className="comment-detail-title">
                  <h2>Commented:</h2>
                </div>
                <p className="comment-text">
                {showFullComment || (selectedComment.comment.length <= 250)
                    ? `"${selectedComment.comment}"`
                    : `"${selectedComment.comment.substring(0, 247)}..."`
                  }
                  {!showFullComment && selectedComment.comment.length > 250 && (
                    <button onClick={handleShowMore}>Show more</button>
                  )}
                </p>
                <div className="draft-reply-container">
                  <div className="draft-reply-header">
                    {/* <img src="/Assets/def_pfp.jpg" alt="Reply Icon" /> */}
                    <span>Your reply draft:</span>
                  </div>
                  <textarea
                    value={draftReply}
                    onChange={handleDraftChange}
                    placeholder="Type your reply..."
                  />
                  <div className="draft-reply-actions">
                    <button className="reject-button" onClick={rejectReply}>Reject ✖</button>
                    <button className="publish-button" onClick={publishReply}>Publish ✈</button>
                  </div>
                </div>
              </>
            ) : (
              <p>Select a comment to view details</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isLoading && <LoadingOverlay />}
      {activeCard ? (
        <DetailScreen 
          activeCard={activeCard} 
          closeDetailScreen={closeDetailScreen} 
          fetchComments={fetchComments}
          removeComment={removeComment}
          rejectedComments={rejectedComments}
          />
      ) : (
      <div className="card-container">
      <div className="refresh-button">
      <button 
        style={isLoading ? {backgroundColor: 'grey', cursor: 'not-allowed'} : {backgroundColor: 'red', cursor: 'pointer'}} 
        disabled={isButtonDisabled}
        onClick={fetchMedia}
      >
          <span> Refresh feed </span>
            <img src="/Assets/refresh_red.png" className="reload" />
          </button>
          <div className="tooltip">
                  <span className="tooltip-icon">?</span>
                  <span className="tooltip-text">A process is a set of structured activities and tasks performed to achieve a specific goal.</span>
          </div>
      </div>
        {limitedData.length > 0 ? limitedData.map((item, index) => (
          <div key={item.id || index} className="card">
            {/* Card Header */}
            <div className="card-header">
            <span className="counter-box">
            {item.comments.filter(comment => comment.published).length}/{item.comments.filter(comment => !rejectedComments.has(comment.id)).length}
            </span>
              <h2> Comments replied </h2>
              <button className="circle-button" onClick={() => fetchComments(item.id, item.username)}>
                <img src="/Assets/reload.png" className="reload" />
              </button>
            </div>
            {/* Card Content */}
            <div className="card-content">
              {/* Image on the left */}
              <img src={item.imageUrl} alt="Post" className="card-image" />

              {/* Text and Button on the right */}
              <div className="card-text">
                <div>
                  <h4>Post Date:</h4>
                  <p className="card-date">{item.date}</p>
                </div>
                
                <button className="card-button" onClick={() => handleCardButtonClick(item)}>
                    Review {item.comments.filter(comment => !rejectedComments.has(comment.id)).length} Draft Replies >
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="empty-screen">
            <h1>No content!</h1>
            <p>Your content will appear here when available.</p>
            {/* <img src="/Assets/def_pfp.jpg" alt="Descriptive Alt Text" /> */}
            <button onClick={fetchMedia}>Get Content</button>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default CardComponent;
