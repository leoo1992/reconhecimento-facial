// Função para carregar os modelos e iniciar o vídeo da câmera
const loadModelsAndStartVideo = async () => {
  try {
    console.error("Carregando modelos...");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.ssdMobilenetv1.loadFromUri("/assets/lib/face-api/models"),
    ]);
    console.error("Modelos carregados com sucesso.");

    await startVideo();
  } catch (error) {
    console.error("Erro ao carregar modelos ou iniciar o vídeo:", error);
    // Realizar ações para lidar com o erro, como exibir uma mensagem de erro na interface do usuário ou enviar um relatório de erro.
  }
};

// Função para iniciar o vídeo da câmera frontal...dispositivo notebook ou celular
const startVideo = async () => {
  try {
    console.error("Iniciando vídeo da câmera...");
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    let constraints = {};

    if (isMobileDevice) {
      constraints = {
        video: {
          facingMode: { exact: "user" },
        },
      };
    } else {
      constraints = {
        video: { facingMode: "user" },
      };
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const cam = document.getElementById("camera"); // Adicionei essa linha para obter a referência ao elemento de vídeo da câmera
    cam.srcObject = stream;

    // Aguardar um tempo para a câmera estar pronta
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verificar se o stream da câmera foi carregado corretamente
    if (!cam.srcObject || !cam.srcObject.getTracks().length) {
      throw new Error("Ocorreu um erro ao carregar o stream da câmera.");
    }

    // Carregar os rótulos das imagens
    const labels = await loadLabels();

    if (labels.length === 0) {
      throw new Error("Nenhum rótulo foi carregado.");
    }

    console.error("Vídeo da câmera iniciado. Iniciando detecção de rostos e reconhecimento facial.");

    const faceMatcher = new faceapi.FaceMatcher(labels, 0.6);

    // Função para detecção de rostos e reconhecimento facial
    const detectFaces = async () => {
      try {
        const detections = await faceapi
          .detectAllFaces(cam, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions()
          .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(
          detections,
          { width: cam.videoWidth, height: cam.videoHeight } // Alterei essa linha para obter as dimensões corretas do vídeo da câmera
        );

        const results = resizedDetections.map((d) =>
          faceMatcher.findBestMatch(d.descriptor)
        );

        const canvas = document.getElementById("canvas"); // Adicionei essa linha para obter a referência ao elemento de canvas
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        results.forEach((result, index) => {
          const box = resizedDetections[index].detection.box;
          const { label, distance } = result;
          new faceapi.draw.DrawTextField(
            [`${label}`],
            box.bottomRight
          ).draw(canvas);
        });
      } catch (error) {
        console.error("Erro ao detectar rostos:", error);
        // Realizar ações para lidar com o erro, se necessário.
      }

      // Chamar novamente a função para detecção de rostos após um intervalo de tempo
      setTimeout(detectFaces, 250);
    };

    // Chamar a função para detecção de rostos
    detectFaces();
  } catch (error) {
    console.error("Erro ao iniciar o vídeo da câmera:", error);
    // Realizar ações para lidar com o erro, como exibir uma mensagem de erro na interface do usuário ou enviar um relatório de erro.
  }
};

// Função para carregar os rótulos das imagens de cada pessoa cadastrada
const loadLabels = async () => {
  const labels = [
    "Antony",
    "Eduardo",
    "Fabio",
    "Fernando",
    "Filipe",
    "Leonardo",
    "Lucas",
    "ProfSamuel",
    "Raphael",
    "Rogerio",
    "Salvan",
    "Samuel",
  ];
  const labeledFaceDescriptors = [];

  for (const label of labels) {
    const descriptions = [];

    for (let i = 1; i <= 3; i++) {
      const imagePath = `/assets/lib/face-api/labels/${label}/${i}.jpg`;
      console.error("Carregando imagem:", imagePath);

      try {
        const img = await faceapi.fetchImage(imagePath);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections && detections.descriptor) {
          descriptions.push(detections.descriptor);
        }
      } catch (error) {
        console.error(
          `Erro ao processar imagem ${imagePath}:`,
          error
        );
        // Realizar ações para lidar com o erro, se necessário.
      }
    }

    if (descriptions.length > 0) {
      const labeledFaceDescriptor = new faceapi.LabeledFaceDescriptors(
        label,
        descriptions
      );
      labeledFaceDescriptors.push(labeledFaceDescriptor);
    }
  }

  if (labeledFaceDescriptors.length === 0) {
    console.warn(
      "Nenhum rosto válido foi detectado nas imagens de treinamento."
    );
  } else {
    console.error("Rótulos carregados com sucesso.");
  }

  return labeledFaceDescriptors;
};

// Verificar a disponibilidade da API do navegador
try {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("A API do navegador não é compatível.");
  }
} catch (error) {
  console.error("O navegador não é compatível:", error);
  // Realizar ações para lidar com o erro, como exibir uma mensagem de erro na interface do usuário ou enviar um relatório de erro.
}

// Chamar a função para carregar os modelos e iniciar o vídeo da câmera
loadModelsAndStartVideo();
