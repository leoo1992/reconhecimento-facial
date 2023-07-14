window.onload = async () => {
  // Função para iniciar o vídeo da câmera frontal
  const startVideo = async () => {
    try {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      let constraints = {};

      if (isMobileDevice) {
        constraints = {
          video: {
            facingMode: { exact: "environment" },
          },
        };
      } else {
        constraints = {
          video: { facingMode: "user" },
        };
      }

      const videoElement = document.getElementById("cam");

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = stream;

      return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          resolve();
        };
      });
    } catch (error) {
      console.error("Erro ao iniciar o vídeo da câmera:", error);
    }
  };

  // Função para carregar os modelos
  const loadModels = async () => {
    try {
      await faceapi.loadTinyFaceDetectorModel("/assets/lib/face-api/models");
      await faceapi.loadFaceLandmark68Model("/assets/lib/face-api/models");
      await faceapi.loadFaceRecognitionModel("/assets/lib/face-api/models");
      await faceapi.loadFaceExpressionModel("/assets/lib/face-api/models");
      await faceapi.loadSsdMobilenetv1Model("/assets/lib/face-api/models");
    } catch (error) {
      console.error("Erro ao carregar os modelos:", error);
    }
  };

  // Função para detectar rostos e realizar o reconhecimento facial
  const detectFaces = async () => {
    try {
      const labels = [
        "Antony",
        "Eduardo",
        "Fabio",
        "Fernando",
        "Filipe",
        "Leonardo",
        "Lucas",
        "Prof Samuel",
        "Raphael",
        "Rogerio",
        "Salvan",
        "Samuel",
      ];

      const labeledDescriptors = await Promise.all(
        labels.map(async (label) => {
          const descriptions = [];

          for (let i = 1; i <= 3; i++) {
            try {
              const img = await faceapi.fetchImage(
                `/assets/lib/face-api/labels/${label}/${i}.jpg`
              );

              const detections = await faceapi
                .detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();

              if (detections) {
                descriptions.push(detections.descriptor);
              }
              console.log(label + ": Carregada foto: " + i);
            } catch (error) {
              console.error(
                "Erro ao carregar a imagem de: " + label + " na posição: " + i,
                error
              );
            }
          }

          if (descriptions.length > 0) {
            return new faceapi.LabeledFaceDescriptors(label, descriptions);
          }
        })
      );

      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

      const videoElement = document.getElementById("cam");
      const canvas = faceapi.createCanvasFromMedia(videoElement);
      document.body.appendChild(canvas);

      const displaySize = {
        width: videoElement.offsetWidth,
        height: videoElement.offsetHeight,
      };
      faceapi.matchDimensions(canvas, displaySize);

      setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        );

        const results = resizedDetections.map((d) =>
          faceMatcher.findBestMatch(d.descriptor)
        );

        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

        faceapi.draw.drawDetections(canvas, resizedDetections);
        results.forEach((result, index) => {
          const { label, distance } = result;
          const box = resizedDetections[index].detection.box;

          const text = `${label} (${Math.round(distance * 100) / 100})`;
          const drawOptions = {
            label: text,
            lineWidth: 2,
          };
          const drawBox = new faceapi.draw.DrawBox(box, drawOptions);
          drawBox.draw(canvas);
        });
      }, 250);
    } catch (error) {
      console.error("Erro durante a detecção de rostos:", error);
    }
  };

  // Carrega os modelos necessários, inicia o vídeo e detecta rostos
  await loadModels();
  await startVideo();
  await detectFaces();
};
