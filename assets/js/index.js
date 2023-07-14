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

    const labels = await loadLabels(); // Carregar os rótulos antes de iniciar o vídeo

    await startVideo(labels); // Passar os rótulos como parâmetro para a função startVideo
  } catch (error) {
    console.error("Erro ao carregar modelos ou iniciar o vídeo:", error);
    // Realizar ações para lidar com o erro, como exibir uma mensagem de erro na interface do usuário ou enviar um relatório de erro.
  }
};

// Função para iniciar o vídeo da câmera frontal...dispositivo notebook ou celular
const startVideo = async (labels) => {
  try {
    console.error("Iniciando vídeo da câmera...");
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    const constraints = {
      video: { facingMode: isMobileDevice ? "user" : "environment" },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const cam = document.getElementById("cam"); // Corrigido o ID para "cam"
    cam.srcObject = stream;

    // Aguardar um tempo para a câmera estar pronta
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verificar se o stream da câmera foi carregado corretamente
    if (!cam.srcObject || !cam.srcObject.getTracks().length) {
      throw new Error("Ocorreu um erro ao carregar o stream da câmera.");
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
          { width: cam.videoWidth, height: cam.videoHeight }
        );

        const results = resizedDetections.map((d) =>
          faceMatcher.findBestMatch(d.descriptor)
        );

        const canvas = document.getElementById("canvas");
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
