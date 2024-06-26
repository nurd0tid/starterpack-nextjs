import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link';

function CategoryCmd(props) {
  const [data, setData] = useState([]);
  const {
    commandId,
    roomId,
    setIsTyping,
    userData,
    reciverName,
    reciverPhoto
  } = props

  // Function Show Data
  const fetchQuestion = async () => {
    try {
      if(commandId) {
        const response = await axios.get('/api/chat/cmd/get/category',  {
          params: {
            id: commandId
          }
        });
  
        if (response.status === 200) {
          setData(response.data)
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Fetching
  useEffect(() => {
    fetchQuestion();
  }, [commandId]);

  const clickCommand = async (text, sender, questionId) => {
    try {
      setIsTyping(true);
      const response = await axios.post('/api/chat/cmd/sending/category', { 
        text: text, 
        sender: sender, 
        room_id: roomId,
        question_id:  questionId,
        sender_name: userData?.sun,
        sender_photo: userData?.photo,
        bot_name: reciverName,
        bot_photo: reciverPhoto
      });
      if (response.status === 200) {
        console.log(response.error)
        setIsTyping(false);
      }
    } catch (error) {
      console.log(error)
      setIsTyping(false);
    }
  }

  return (
    <div>
      <div className='btn-list mt-4'>
        {data.map((qs, index) => (
          <Link href="#!" className="btn btn-outline-primary btn-sm" key={index} onClick={() => clickCommand(qs.question, 'user', qs.id)}>{qs.question}</Link>
        ))}
      </div>
      <p className='mt-4'>Tidak puas dengan opsi yang ada? kamu dapat menanyakan secara langsung dengan memilih fitur <b>Live Chat</b> ataupun <b>Chat Assistant</b></p>
    </div>
  )
}

export default CategoryCmd