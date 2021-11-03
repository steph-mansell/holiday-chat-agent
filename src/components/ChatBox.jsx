import "./ChatBox.css";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatBubble from "./ChatBubble";
import HolidayMatchBubble from "./HolidayMatchBubble";
import MatchedHolidayCount from "./MatchedHolidayCount";

function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [sessionId, setSessionId] = useState();
  const [agentTyping, setAgentTyping] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  function resetChat() {
    // setting a new unique session ID when app is rendered
    setSessionId(uuidv4());

    setRecommendations([]);

    // initial messages from agent
    setMessages([
      {
        sender: "agent",
        text: "Hi, I'm HoliBot! First Holiday's assistant.",
      },
      {
        sender: "agent",
        text: "I'm here to recommend you a holiday. I'll have to ask you a series of questions in order to tailor pick your next destination.",
      },
      {
        sender: "agent",
        text: "First things first, what type of holiday are you looking for? Examples could be a trip to the mountains, a city break, or an escape to the beach?",
      },
    ]);
  }

  useEffect(() => {
    resetChat();
  }, []);

  function handleMessageInput(e) {
    setCurrentMessage(e.target.value);
  }

  function handleSendMessage(e) {
    if (!currentMessage) {
      return;
    }

    const requestBody = {
      sessionId: sessionId,
      queryInput: {
        text: {
          text: currentMessage,
          languageCode: "en-GB",
        },
      },
    };

    setMessages((prevState) => {
      const newState = [...prevState];
      newState.push({ sender: "user", text: currentMessage });
      return newState;
    });

    setAgentTyping(true);

    // Calls Dialogflow to retrieve the agent response
    fetch(
      "https://europe-west1-holiday-chat-agent-c1c27.cloudfunctions.net/dialogflowGateway",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => {
        return response.json();
      })
      .then((response) => {
        console.log(response);
        setAgentTyping(false);
        setMessages((prevState) => {
          const newState = [...prevState];
          newState.push({ sender: "agent", text: response.fulfillmentText });
          return newState;
        });

        // Checking if all required parameters from Dialogflow have been given by user
        if (response.action === "HolidayFinder.HolidayFinder-yes") {
          const fields = response.outputContexts[0].parameters.fields;
          const params = {
            climate: fields.climate.stringValue,
            location: fields.location.stringValue,
            continent: fields.continent.stringValue,
            activitylevel: fields.activitylevel.stringValue,
          };

          // Retrieving holiday data if params match with holiday destinations
          fetch(
            "https://europe-west1-holiday-chat-agent-c1c27.cloudfunctions.net/getHolidayResponse",
            {
              method: "POST",
              body: JSON.stringify(params),
              headers: {
                "Content-Type": "application/json",
              },
            }
          )
            .then((response) => {
              return response.json();
            })
            .then((response) => {
              setRecommendations(response);
            });
        }
      });
    // Setting the message field back to empty when submitting
    setCurrentMessage("");
  }

  // Allowing the user to press enter when finished with their message
  function keyPressHandler(e) {
    if (e.charCode === 13) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  return (
    <div className="chatbox-container">
      <div className="chatbox">
        <div className="messages">
          {messages.map((message) => (
            <ChatBubble message={message} />
          ))}
          {agentTyping && (
            <ChatBubble message={{ sender: "agent", text: "..." }} />
          )}

          <MatchedHolidayCount length={recommendations.length} />

          {recommendations.map((recommendation) => {
            return <HolidayMatchBubble recommendation={recommendation} />;
          })}
        </div>
        <div className="input">
          {recommendations.length > 0 ? (
            <button onClick={resetChat}>Want to start again?</button>
          ) : (
            <>
              <input
                type="text"
                value={currentMessage}
                onChange={handleMessageInput}
                onKeyPress={keyPressHandler}
                placeholder=" Start your conversation with the agent here..."
              />
              <button onClick={handleSendMessage}>Send</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatBox;
