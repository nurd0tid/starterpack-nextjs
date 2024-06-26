import supabase from "../../../../../supabase";
import checkPermission from "@/pages/utils/auth/checkPermission";
import verifyToken from "@/pages/utils/auth/verifyToken";
import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const cookie = req.cookies.currentUser;

      if (!cookie) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { accessToken } = JSON.parse(cookie);

      const { isValid, roleId } = await verifyToken(accessToken);

      if (isValid) {
        const { text, sender, thread_id, room_id, assistant_id, status, credit, userId, sender_name, sender_photo, bot_name, bot_photo } = req.body;

        if (status) {
          // Insert original message into Supabase
          const { data: insertedMessage, error } = await supabase.rpc('create_fn_sending_ai_ready', {
            new_thread_room_id: room_id,
            new_content: text,
            new_role: sender,
            new_type_chat: 'text',
            new_credit: credit,
            new_user_id: userId,
            new_sender_name: sender_name,
            new_sender_photo: sender_photo
          });

          if (error) throw new Error(error.message);

          // Call OpenAI API for response
          const response = await openai.beta.threads.messages.create(
            thread_id,
            {
              role: sender,
              content: text
            }
          );

          // Create Run Instruction
          const run = await openai.beta.threads.runs.create(
            thread_id,
            { 
              assistant_id: assistant_id,
            }
          );

          // Checking Run Status
          let runStatus = await openai.beta.threads.runs.retrieve(
            thread_id,
            run.id
          );

          // If Complete Status Get Lat Message
          while (runStatus.status !== "completed") {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            runStatus = await openai.beta.threads.runs.retrieve(thread_id, run.id);
          }

          // Get the last assistant message from the messages array
          const messages = await openai.beta.threads.messages.list(thread_id,);

          // Find the last message for the current run
          const lastMessageForRun = messages.data
            .filter(
              (message) => message.run_id === run.id && message.role === "assistant"
            )
            .pop();

          // If an assistant message is found, console.log() it
          if (lastMessageForRun) {
            // Insert response into Supabase
            const { data: insertedReply, error: replyError } = await supabase.rpc('create_fn_sending_ai_reply_ready', {
              new_thread_room_id: room_id,
              new_content: lastMessageForRun.content[0].text.value,
              new_role: 'assistant',
              new_type_chat: 'text',
              new_sender_name: `Assistant ${bot_name}`,
              new_sender_photo: bot_photo
            });

            if (replyError) throw new Error(replyError.message);
          }

          res.status(200).json({ message: 'Successfully sending message!' });
        } else {
          // Insert original message into Supabase
          const { data: insertedMessage, errorInsert } = await supabase.rpc('create_fn_sending_ai_not_ready', {
            new_thread_room_id: room_id,
            new_content: text,
            new_role: sender,
            new_type_chat: 'text',
            new_sender_name: sender_name,
            new_sender_photo: sender_photo
          });

          if (errorInsert) throw new Error(errorInsert.message);

          const { data, error } = await supabase.rpc('create_fn_sending_ai_reply_not_ready', {
            new_thread_room_id: room_id,
            new_content: 'Wahh, credit kamu sudah habis, kalau kamu merasa puas dengan setiap jawaban legalnowy, jangan lupa isi credit lagi ya😁',
            new_role: 'system',
            new_type_chat: 'text',
            new_command_show: true,
            new_command_id: 'a2123a45-9838-4a9e-b28c-e03c4fac62a4',
            new_initial_command: 2,
            new_sender_name: `Assistant ${bot_name}`,
            new_sender_photo: bot_photo
          });

          if (error) throw new Error(error.message);

          res.status(201).json({
            type_chat: data.type_chat,
            message: 'Credit kamu sudah habis!',
          });
        }
      } else {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
