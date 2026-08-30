using UnityEngine;
using UnityEditor;
using TMPro;

/// <summary>
/// 模擬スーパーの3D店舗を自動生成するエディタースクリプト
/// Menu: Store Tools > Generate Store
/// </summary>
public class StoreGenerator : EditorWindow
{
    [MenuItem("Store Tools/Generate Store")]
    public static void GenerateStore()
    {
        // 1. 既存Storeオブジェクトの確認とダイアログ表示
        GameObject existingStore = GameObject.Find("Store");
        if (existingStore != null)
        {
            bool proceed = EditorUtility.DisplayDialog(
                "店舗再生成の確認",
                "すでに 'Store' オブジェクトが存在します。削除して新規生成しますか？",
                "削除して生成",
                "キャンセル"
            );

            if (!proceed) return;

            Undo.DestroyObjectImmediate(existingStore);
        }

        // 2. マテリアル生成（URP / Standard両対応）
        Material matFloor = CreateMaterial(new Color(0.85f, 0.85f, 0.85f), "Mat_Floor");       // 明るいグレー
        Material matWall = CreateMaterial(new Color(0.95f, 0.95f, 0.95f), "Mat_Wall");         // 白
        Material matShelf = CreateMaterial(new Color(0.92f, 0.86f, 0.75f), "Mat_Shelf");       // 薄いベージュ
        Material matRegister = CreateMaterial(new Color(0.25f, 0.25f, 0.25f), "Mat_Register");   // 濃いグレー
        Material matEntrance = CreateMaterial(new Color(0.2f, 0.5f, 0.9f), "Mat_Entrance");     // 青

        // 3. ルートおよび階層（グループ）の生成
        GameObject storeRoot = new GameObject("Store");
        Undo.RegisterCreatedObjectUndo(storeRoot, "Generate Store");

        Transform envGroup = new GameObject("Environment").transform;
        envGroup.SetParent(storeRoot.transform);

        Transform shelvesGroup = new GameObject("Shelves").transform;
        shelvesGroup.SetParent(storeRoot.transform);

        Transform registersGroup = new GameObject("Registers").transform;
        registersGroup.SetParent(storeRoot.transform);

        Transform navGroup = new GameObject("Navigation").transform;
        navGroup.SetParent(storeRoot.transform);

        Transform lightsGroup = new GameObject("Lights").transform;
        lightsGroup.SetParent(storeRoot.transform);

        // ---------------------------------------------------------
        // 【Environment】店舗建屋 (20m x 14m, 壁高さ3m)
        // ---------------------------------------------------------
        // 床 (幅20m x 奥行14m)
        CreateCube("Floor", envGroup, new Vector3(0, -0.1f, 0), new Vector3(20f, 0.2f, 14f), matFloor);

        // 外壁 (高さ3m, 厚さ0.4m)
        CreateCube("Wall_Back", envGroup, new Vector3(0, 1.5f, 7f), new Vector3(20f, 3f, 0.4f), matWall);       // 奥壁
        CreateCube("Wall_Left", envGroup, new Vector3(-10f, 1.5f, 0), new Vector3(0.4f, 3f, 14f), matWall);    // 左壁
        CreateCube("Wall_Right", envGroup, new Vector3(10f, 1.5f, 0), new Vector3(0.4f, 3f, 14f), matWall);   // 右壁

        // 手前壁（中央に4mの入口を確保するため左右に分割）
        CreateCube("Wall_Front_Left", envGroup, new Vector3(-6f, 1.5f, -7f), new Vector3(8f, 3f, 0.4f), matWall);  // 手前左(8m)
        CreateCube("Wall_Front_Right", envGroup, new Vector3(6f, 1.5f, -7f), new Vector3(8f, 3f, 0.4f), matWall); // 手前右(8m)

        // 入口床（青色表示）
        CreateCube("Entrance", envGroup, new Vector3(0, 0.01f, -7f), new Vector3(4f, 0.02f, 2f), matEntrance);

        // ---------------------------------------------------------
        // 【Shelves】棚8台 (Shelf_01 〜 Shelf_08)
        // ---------------------------------------------------------
        string[] categories = {
            "青果", "精肉", "鮮魚", "惣菜",
            "加工食品", "冷凍食品", "飲料", "乳製品" // Shelf_08は乳製品売り場
        };

        // 2行4列配置（通路上に十分な幅を保持）
        float[] xPosList = { -6f, -2f, 2f, 6f };
        float[] zPosList = { 3.5f, -0.5f };

        int index = 0;
        for (int r = 0; r < zPosList.Length; r++)
        {
            for (int c = 0; c < xPosList.Length; c++)
            {
                index++;
                string shelfName = $"Shelf_{index:D2}";
                string categoryName = categories[index - 1];

                Vector3 shelfPos = new Vector3(xPosList[c], 0f, zPosList[r]);

                // 棚親オブジェクト
                GameObject shelfObj = new GameObject(shelfName);
                shelfObj.transform.SetParent(shelvesGroup);
                shelfObj.transform.position = shelfPos;

                // 棚本体 (高さ1.2mの低め設計 / BoxCollider自動付与)
                GameObject shelfBody = CreateCube("ShelfBody", shelfObj.transform, new Vector3(0, 0.6f, 0), new Vector3(2.2f, 1.2f, 1.0f), matShelf);

                // 看板 (TextMeshPro 3D)
                GameObject signObj = new GameObject("Sign");
                signObj.transform.SetParent(shelfObj.transform, false);
                signObj.transform.localPosition = new Vector3(0, 1.9f, 0);

                TextMeshPro tmp = signObj.AddComponent<TextMeshPro>();
                tmp.text = $"{categoryName}\n棚 {index:D2}";
                tmp.fontSize = 4.2f;
                tmp.alignment = TextAlignmentOptions.Center;
                tmp.color = new Color(0.06f, 0.10f, 0.18f, 1f);
                tmp.outlineWidth = 0.2f;
                tmp.outlineColor = Color.white;
                tmp.rectTransform.sizeDelta = new Vector2(3f, 1.3f);

                // 看板背景 (SignBackground) : 文字の可読性向上のための単色パネル
                // Signの兄弟ではなく子に配置（TextMeshProのRectTransformとは独立したTransformで管理）
                GameObject signBg = GameObject.CreatePrimitive(PrimitiveType.Quad);
                signBg.name = "SignBackground";
                Collider signBgCollider = signBg.GetComponent<Collider>();
                if (signBgCollider != null)
                {
                    Object.DestroyImmediate(signBgCollider);
                }
                signBg.transform.SetParent(signObj.transform, false);
                signBg.transform.localPosition = new Vector3(0f, 0f, 0.05f); // 文字よりわずかに奥へ配置（Zファイティング回避）
                signBg.transform.localRotation = Quaternion.identity;
                signBg.transform.localScale = new Vector3(3.3f, 1.3f, 1f);

                MeshRenderer signBgRenderer = signBg.GetComponent<MeshRenderer>();
                signBgRenderer.sharedMaterial = GetOrCreateShelfSignBackgroundMaterial();
                signBgRenderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                signBgRenderer.receiveShadows = false;

                // 各棚の通路側にDestinationPointを配置 (棚の手前側 Z-1.2m)
                GameObject destPoint = new GameObject($"DestinationPoint_{shelfName}");
                destPoint.transform.SetParent(navGroup);
                destPoint.transform.position = shelfPos + new Vector3(0, 0, -1.2f);
            }
        }

        // ---------------------------------------------------------
        // 【Registers】レジ2台
        // ---------------------------------------------------------
        CreateCube("Register_01", registersGroup, new Vector3(-2.5f, 0.5f, -4.5f), new Vector3(1.6f, 1.0f, 0.8f), matRegister);
        CreateCube("Register_02", registersGroup, new Vector3(2.5f, 0.5f, -4.5f), new Vector3(1.6f, 1.0f, 0.8f), matRegister);

        // ---------------------------------------------------------
        // 【Navigation】PlayerStart
        // ---------------------------------------------------------
        GameObject playerStart = new GameObject("PlayerStart");
        playerStart.transform.SetParent(navGroup);
        playerStart.transform.position = new Vector3(0, 0, -6.5f);

        // ---------------------------------------------------------
        // 【Lights】店舗用ライト
        // ---------------------------------------------------------
        GameObject lightObj = new GameObject("Directional Light");
        lightObj.transform.SetParent(lightsGroup);
        Light lightComp = lightObj.AddComponent<Light>();
        lightComp.type = LightType.Directional;
        lightComp.color = new Color(1.0f, 0.98f, 0.95f);
        lightComp.intensity = 1.2f;
        lightObj.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

        // 店舗全体が明るくなるよう環境光を設定
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.65f, 0.65f, 0.65f);

        // ---------------------------------------------------------
        // 【Main Camera】俯瞰用カメラ設定
        // ---------------------------------------------------------
        Camera mainCam = Camera.main;
        if (mainCam == null)
        {
            GameObject camObj = new GameObject("Main Camera");
            camObj.tag = "MainCamera";
            mainCam = camObj.AddComponent<Camera>();
            camObj.AddComponent<AudioListener>();
        }
        mainCam.transform.position = new Vector3(0f, 16f, -14f);
        mainCam.transform.rotation = Quaternion.Euler(48f, 0f, 0f);

        // 完了後に生成オブジェクトを選択表示
        Selection.activeGameObject = storeRoot;
        SceneView.FrameLastActiveSceneView();

        Debug.Log("[StoreGenerator] 3D模擬スーパーマーケットの生成が完了しました！");
    }

    /// <summary>
    /// Cubeプリミティブ生成用ヘルパー
    /// </summary>
    private static GameObject CreateCube(string name, Transform parent, Vector3 localPos, Vector3 scale, Material mat)
    {
        GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cube.name = name;
        cube.transform.SetParent(parent, false);
        cube.transform.localPosition = localPos;
        cube.transform.localScale = scale;

        if (mat != null)
        {
            MeshRenderer mr = cube.GetComponent<MeshRenderer>();
            if (mr != null)
            {
                mr.sharedMaterial = mat;
            }
        }
        return cube;
    }

    /// <summary>
    /// 棚サイン背景用マテリアルをアセットとして取得（存在しない場合のみ新規作成）。
    /// ShelfHighlighterのGetComponentsInChildren&lt;Renderer&gt;による発光対象へ含まれても
    /// URP/Unlitシェーダーは_EmissionColorプロパティを持たないため、発光の影響を受けない。
    /// </summary>
    private const string ShelfSignBackgroundMaterialPath = "Assets/Materials/Mat_ShelfSignBackground.mat";

    private static Material GetOrCreateShelfSignBackgroundMaterial()
    {
        Material existing = AssetDatabase.LoadAssetAtPath<Material>(ShelfSignBackgroundMaterialPath);
        if (existing != null)
        {
            return existing;
        }

        if (!AssetDatabase.IsValidFolder("Assets/Materials"))
        {
            AssetDatabase.CreateFolder("Assets", "Materials");
        }

        Shader shader = Shader.Find("Universal Render Pipeline/Unlit");
        if (shader == null)
        {
            shader = Shader.Find("Unlit/Color");
        }

        Material mat = new Material(shader) { name = "Mat_ShelfSignBackground" };
        Color paleBlue = new Color(0.878f, 0.937f, 0.984f, 1f); // 非常に薄い水色
        if (mat.HasProperty("_BaseColor"))
        {
            mat.SetColor("_BaseColor", paleBlue);
        }
        mat.color = paleBlue;

        AssetDatabase.CreateAsset(mat, ShelfSignBackgroundMaterialPath);
        AssetDatabase.SaveAssets();
        return mat;
    }

    /// <summary>
    /// URP / Standard シェーダー自動判別マテリアル作成
    /// </summary>
    private static Material CreateMaterial(Color color, string name)
    {
        Shader shader = Shader.Find("Universal Render Pipeline/Lit");
        if (shader == null)
        {
            shader = Shader.Find("Standard");
        }
        if (shader == null)
        {
            shader = Shader.Find("Unlit/Color");
        }

        Material mat = new Material(shader)
        {
            name = name,
            color = color
        };

        // URP用プロパティへのフォールバック
        if (mat.HasProperty("_BaseColor"))
        {
            mat.SetColor("_BaseColor", color);
        }

        return mat;
    }
}
