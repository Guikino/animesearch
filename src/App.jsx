import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Camera, Check, Loader } from "lucide-react";
import React, { useState, useRef } from "react";

const MAX_FILE_SIZE_MB = 20; // Tamanho máximo do arquivo em MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // Convertendo MB para bytes

const resizeImage = (file, maxSize) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onloadend = () => {
      img.src = reader.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      let width = img.width;
      let height = img.height;

      // Calcula a escala para manter a proporção
      let scale = Math.sqrt(maxSize / (width * height));
      if (scale > 1) scale = 1; // Não redimensionar para mais que o tamanho original

      width *= scale;
      height *= scale;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob.size > maxSize) {
          // Reduzir a qualidade ainda mais se necessário
          canvas.toBlob((newBlob) => {
            if (newBlob.size > maxSize) {
              reject("Image size exceeds the maximum allowed size");
            } else {
              const resizedImage = new File([newBlob], file.name, { type: "image/jpeg" });
              resolve(resizedImage);
            }
          }, "image/jpeg", 0.5); // Reduzir a qualidade
        } else {
          const resizedImage = new File([blob], file.name, { type: "image/jpeg" });
          resolve(resizedImage);
        }
      }, "image/jpeg", 0.7); // Compressão JPEG
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const extractAnimeName = (str) => {
  const match = str.match(/\[(.*?)\]/g);
  if (match && match.length >= 2) {
    return match[1].slice(1, -1).trim(); // Remove os colchetes e retorna o conteúdo
  }
  const hyphenMatch = str.match(/\] ([^-]+) -/);
  if (hyphenMatch) {
    return hyphenMatch[1].trim();
  }
  return 'Nome não encontrado';
};

export default function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [resizedFile, setResizedFile] = useState(null); // Novo estado para armazenar o arquivo redimensionado
  const [showResults, setShowResults] = useState(false); // Novo estado para controlar a exibição dos resultados
  const [isQueryLoading, setIsQueryLoading] = useState(false); // Novo estado para controlar o carregamento da consulta
  const fileInputRef = useRef(null);

  const { isLoading, error, data, refetch } = useQuery({
    queryKey: ["animes", resizedFile],
    queryFn: async () => {
      if (!resizedFile) return;

      const formData = new FormData();
      formData.append('image', resizedFile);

      const response = await axios.post(
        "https://api.trace.moe/search",
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        } 
      );
      return response.data;
    },
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: false // Desabilita a consulta automática
  });

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const resizedFile = await resizeImage(file, MAX_FILE_SIZE_BYTES);
        setResizedFile(resizedFile); // Armazena o arquivo redimensionado no estado
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageSrc(reader.result);
        };
        reader.readAsDataURL(resizedFile);
        setShowResults(false); 
      } catch (error) {
        console.error('Erro ao redimensionar a imagem:', error);
        alert('Ocorreu um erro ao processar a imagem. Por favor, tente novamente.');
      }
    }
  };

  const handleVerify = () => {
    setIsQueryLoading(true); 
    refetch().then(() => {
      setShowResults(true); 
      setIsQueryLoading(false); 
    });
  };

  return (
    <div>
      <header className="text-center mt-16">
        <h1 className="text-6xl bg-gradient-to-r mb-2 from-red-500 bg-[rgba(80,80,80,0.32)] to-blue-500 bg-clip-text
         text-transparent inline-block text-3xl">
          Buscanime
        </h1>
        <p className="text-white text-xl max-md:text-sm max-md:justify max-md:w-[90%] max-md:m-auto">
          Abaixo adicione uma imagem trecho de algum anime para saber qual anime é, e qual episódio está sendo exibido
        </p>
      </header>


      <main className="w-1/2 m-auto pb-8 rounded-lg bg-neutral-800 mt-12 max-md:w-[90%]"
       style={{boxShadow:'12px 12px 12px rgba(166,166,166,0.2), -10px -10px 10px black'}}>
        <form className="text-white flex gap-4 justify-center pt-6 pb-4">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={handleClick}
            className="bg-gradient-to-r from-red-500 bg-[rgba(80,80,80,0.32)] to-blue-500 text-white px-4 py-1 rounded
             flex items-center justify-center gap-2  max-md:w-28 max-md:text-[12px]"
          >
            {imageSrc ? (
              <>
                Imagem escolhida <Check color="white" />
              </>
            ) : (
              'Escolher imagem'
            )}
          </button>
          <button
            type="button"
            onClick={handleVerify}
            className="bg-transparent border-2 border-black hover:bg-neutral-700 transition-all cursor-pointer rounded-lg py-4 px-12 max-md:w-28 max-md:text-[12px] max-md:px-0"
          >
            Verificar
          </button>
        </form>
        {imageSrc ? (
          <div className="m-auto w-96 h-64 mt-4 max-md:w-[90%]">
            <img src={imageSrc} alt="Imagem selecionada" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div onClick={handleClick} className="
          max-md:w-[90%]
          m-auto w-96 h-64 mt-4 flex items-center cursor-pointer justify-center bg-neutral-700">
            <Camera size={32} color="white" />
          </div>
        )}
        {(isQueryLoading || isLoading) && <p className="mt-6"><Loader className="animate-spin text-center m-auto" size={32} color="white"/></p>}
        {error && <p className="text-white text-xl text-center">Erro: {error.message}</p>}
        
        {showResults && data && data.result && data.result.length > 0 && (
          <section className="text-white w-full">
            <div className="flex gap-4 max-md:gap-2 max-md:block max-md:text-center items-center justify-center pt-6 pb-4">
              <p className="font-bold text-xl max-md:text-sm"> Nome do anime: <strong className="bg-gradient-to-r from-red-500 bg-[rgba(80,80,80,0.32)] to-blue-500 bg-clip-text text-transparent inline-block">
                {extractAnimeName(data.result[0].filename)}</strong></p>

              <p className="font-bold text-xl max-md:text-sm">Episódio: <strong 
                className="bg-gradient-to-r from-red-500 bg-[rgba(80,80,80,0.32)] to-blue-500 bg-clip-text text-transparent inline-block">
                  {data.result[0].episode}</strong></p>
              <p className="font-bold text-xl max-md:text-sm">Similaridade: <strong
                className="bg-gradient-to-r from-red-500 bg-[rgba(80,80,80,0.32)] to-blue-500 bg-clip-text text-transparent inline-block">
                  {(data.result[0].similarity * 100).toFixed(2)}%</strong></p> 
            </div>
            <video src={data.result[0].video} className="w-[70%] m-auto" autoPlay loop></video>
          </section>
        )}
      </main>
    </div>
  )
}
