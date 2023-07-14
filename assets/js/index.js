   // Obtém o elemento de vídeo da câmera
  const cam = document.getElementById("cam");

  // Função para iniciar o vídeo da câmera frontal...dispositivo notebook ou celular
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
  
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cam.srcObject = stream;
    } catch (error) {
      console.error("Erro ao iniciar o vídeo da câmera:", error);
    }
  };
  

  // Função para carregar os rótulos das imagens de cada pessoa cadastrada
  const loadLabels = () => {
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
      "Samuel"
    ];
    return Promise.all(
      labels.map(async (label) => {
        const descriptions = [];
        for (let i = 1; i <= 3; i++) {
          const img = await faceapi.fetchImage(
            `/assets/lib/face-api/labels/${label}/${i}.jpg`
          );
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (detections) { // Verificar se detections é válido
            descriptions.push(detections.descriptor);
          }
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  };
  

  // Função para carregar os modelos
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/assets/lib/face-api/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/assets/lib/face-api/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/assets/lib/face-api/models"),
    faceapi.nets.faceExpressionNet.loadFromUri("/assets/lib/face-api/models"),
    faceapi.nets.ssdMobilenetv1.loadFromUri("/assets/lib/face-api/models"),
  ]).then(startVideo);

  // Função para detectar rostos e realizar o reconhecimento facial
  cam.addEventListener("play", async () => {
    const canvas = faceapi.createCanvasFromMedia(cam);
    const canvasSize = {
      width: cam.width,
      height: cam.height,
    };
    const labels = await loadLabels();
    faceapi.matchDimensions(canvas, canvasSize);
    document.body.appendChild(canvas);
    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(cam, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptors();
      const resizedDetections = faceapi.resizeResults(detections, canvasSize);
      const faceMatcher = new faceapi.FaceMatcher(labels, 0.6);
      const results = resizedDetections.map((d) =>
        faceMatcher.findBestMatch(d.descriptor)
      );
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
    }, 250);
  });