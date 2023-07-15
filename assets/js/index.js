// Função para carregar os modelos e iniciar o vídeo da câmera
const cam = document.getElementById("cam");

const loadModels = async () => {
  try {
    console.log("Carregando modelos...");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri(
        "/assets/lib/face-api/models"
      ),
      faceapi.nets.faceExpressionNet.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.ageGenderNet.loadFromUri("/assets/lib/face-api/models"),
      faceapi.nets.ssdMobilenetv1.loadFromUri("/assets/lib/face-api/models"),
    ]).then(startVideo);
    console.log("Modelos carregados com sucesso.");
  } catch (error) {
    console.error("Erro ao carregar os modelos:", error);
  }
};

// Função para iniciar o vídeo da câmera frontal...dispositivo notebook ou celular
const startVideo = async () => {
  try {
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    let constraints;
    if (isMobileDevice) {
      constraints = { video: { facingMode: "user" } }; // Usar a câmera frontal do celular (selfie)
    } else {
      // Verificar se a câmera C920 está disponível
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      const c920Device = videoDevices.find((device) =>
        device.label.includes("C920")
      );

      if (c920Device) {
        constraints = { video: { deviceId: c920Device.deviceId } }; // Usar a câmera C920 do PC
      } else {
        // Caso a câmera C920 não seja encontrada, usar a câmera padrão do PC
        constraints = { video: true };
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const cam = document.getElementById("cam");
    cam.srcObject = stream;

    await new Promise((resolve) => {
      cam.onloadedmetadata = () => {
        cam.play();
        resolve();
      };
    });

    console.log("Vídeo da câmera iniciado com sucesso.");
  } catch (error) {
    console.error("Erro ao iniciar o vídeo da câmera:", error);
    // Realizar ações para lidar com o erro, como exibir uma mensagem de erro na interface do usuário ou enviar um relatório de erro.
  }
};

const loadLabels = async () => {
  const labels = [
    //"Antony",
    // "Eduardo",
    //"Fabio",
    //"Fernando",
    //"Filipe",
    "Leonardo",
    //"Lucas",
    //"ProfSamuel",
    //"Raphael",
    //"Rogerio",
    //"Salvan",
    //"Samuel",
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
          .withFaceDescriptor();
        if (detections) {
          descriptions.push(detections.descriptor);
          console.log(
            "Imagem: " + i + " de : " + label + ". Carregada com sucesso!"
          );
        } else {
          console.error("Erro ao detectar rosto para a imagem:", img);
        }
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
};

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
      .withAgeAndGender()
      .withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, canvasSize);
    const faceMatcher = new faceapi.FaceMatcher(labels, 0.6);
    const results = resizedDetections.map((d) =>
      faceMatcher.findBestMatch(d.descriptor)
    );
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    resizedDetections.forEach((detection) => {
      const { age, gender, genderProbability } = detection;
      new faceapi.draw.DrawTextField(
        [
          `${parseInt(age, 10)} years`,
          `${gender} (${parseInt(genderProbability * 100, 10)})`,
        ],
        detection.box.topRight
      ).draw(canvas);
    });
    results.forEach((result, index) => {
      const box = resizedDetections[index].detection.box;
      const { label, distance } = result;
      new faceapi.draw.DrawTextField(
        [`${label} (${parseInt(distance * 100, 10)})`],
        box.bottomRight
      ).draw(canvas);
    });
  }, 100);
});
