import { openai } from "./openai.js";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";

const question = process.argv[2] || "hi";
const video = "https://youtu.be/zR_iuq2evXo?si=cG8rODgRgXOx9_Cn";

const createStore = (docs) => {
  return MemoryVectorStore.fromDocuments(docs, new OpenAIEmbeddings());
};

const docsFromYTVideo = (video) => {
  const loader = YoutubeLoader.createFromUrl(video, {
    language: "en",
    addVideoInfo: true,
  });

  return loader.load(
    new CharacterTextSplitter({
      separator: " ",
      chunkSize: 1500,
      chunkOverlap: 100,
    })
  );
};

const docsFromPDF = () => {
  const loader = new PDFLoader("./xbox.pdf");

  return loader.load(
    new CharacterTextSplitter({
      separator: ". ",
      chunkSize: 3000,
      chunkOverlap: 200,
    })
  );
};

const loadStore = async () => {
  // const videoDocs = await docsFromYTVideo(video);

  const pdfDocs = await docsFromPDF();

  return createStore([...pdfDocs]);
};

const query = async () => {
  const store = await loadStore();
  const results = await store.similaritySearch(question, 2);

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful AI assistant. Answer questions to your best ability.",
      },
      {
        role: "user",
        content: `Answer the following question using the provided context. If you cannot answer the question with the context, don't lie and make up stuff. Just say that you need more context.
         Question: ${question}
         Context: ${results.map((r) => r.pageContent).join("\n")}`,
      },
    ],
  });

  console.log(
    `Answer: ${response.choices[0].message.content}\nSources: ${results
      .map((r) => r.metadata.source)
      .join(", ")}`
  );
};

query();
