// Função para carregar os modelos e iniciar o vídeo da câmera
const loadModelsAndStartVideo = async () => {
  try {
    console.log("Carregando modelos...");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.ageGenderNet.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.ssdMobilenetv1.loadFromUri("/assets/lib/face-api/models"),
    ]);
    console.log("Modelos carregados com sucesso.");

    const labels = await loadLabels(); // Carregar os rótulos antes de iniciar o vídeo
    

    await startVideo(labels); // Passar os rótulos como parâmetro para a função startVideo
  } catch (error) {
    console.error("Erro ao iniciar o vídeo:", error);
    // Realizar ações para lidar com o erro, como exibir uma mensagem de erro na interface do usuário ou enviar um relatório de erro.
  }
};

// Função para iniciar o vídeo da câmera frontal...dispositivo notebook ou celular
const startVideo = async (labels) => {
  try {
    console.log("Iniciando vídeo da câmera...");
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    const constraints = {
      video: { facingMode: isMobileDevice ? "user" : "environment" },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const cam = document.getElementById("cam");
    cam.srcObject = stream;

    await new Promise((resolve) => {
      cam.onloadedmetadata = () => {
        cam.play();
        resolve();
      };
    });

    console.log(
      "Vídeo da câmera iniciado. Iniciando detecção de rostos e reconhecimento facial."
    );

    const faceMatcher = new faceapi.FaceMatcher(labels, 0.6);

    // Função para detecção de rostos e reconhecimento facial
    const detectFaces = async () => {
      try {
        const detections = await faceapi
          .detectAllFaces(cam, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions()
          .withFaceDescriptors();

        if (detections.length > 0) {
          const resizedDetections = faceapi.resizeResults(detections, {
            width: cam.videoWidth,
            height: cam.videoHeight,
          });

          const results = resizedDetections.map((d) =>
            faceMatcher.findBestMatch(d.descriptor)
          );

          const canvas = document.getElementById("canvas");
          canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          results.forEach((result, index) => {
            const box = resizedDetections[index].detection.box;
            const { label, distance } = result;
            new faceapi.draw.DrawTextField([`${label}`], box.bottomRight).draw(
              canvas
            );
          });
        } else {
          // Nenhum rosto detectado
          console.warn("Nenhum rosto detectado.");
        }
      } catch (error) {
        console.error("Erro ao detectar rostos:", error);
        // Realizar ações para lidar com o erro, se necessário.
      }

      // Chamar novamente a função para detecção de rostos usando requestAnimationFrame
      requestAnimationFrame(detectFaces);
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

  return Promise.all(
    labels.map(async (label) => {
    const descriptions = [];

    for (let i = 1; i <= 3; i++) {
      const img = await faceapi.fetchImage(
        `/assets/lib/face-api/labels/${label}/${i}.jpg`
      );
      console.log("Carregando imagem: " + i + " de : " + label);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor()
          descriptions.push(detections.descriptor);
        }
    return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
};

// Chamar a função para carregar os modelos e iniciar o vídeo
loadModelsAndStartVideo();
