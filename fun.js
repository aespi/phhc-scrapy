


const layers = [
  {"name":"Layer-1","layerID":"q-la-111","hasUsed":[]},
  {"name":"Layer-2","layerID":"q-la-222","hasUsed":["q-la-111"]},
  // {"name":"Layer-3","layerID":"q-la-333","hasUsed":["q-la-222"]},
  // {"name":"Layer-4","layerID":"q-la-444","hasUsed":["q-la-333"]},
  // {"name":"Layer-5","layerID":"q-la-5","hasUsed":["q-la-444"]},
  // {"name":"Layer-6","layerID":"q-la-6","hasUsed":["q-la-5"]},
  // {"name":"Layer-7","layerID":"q-la-7","hasUsed":["q-la-6"]},
  // {"name":"Layer-8","layerID":"q-la-8","hasUsed":["q-la-7"]},
  // {"name":"Layer-9","layerID":"q-la-9","hasUsed":["q-la-8"]},
  // {"name":"Layer-10","layerID":"q-la-10","hasUsed":["q-la-9"]}
  ];

  let structuredLayers =[];
  function findLayer (layerID){
    return layers.find(l=>l.layerID===layerID);
  }
  // structuredLayers = layers.map(l=>[l]);
  let counter=0;
  function getLayerStructure(layerArr){
    console.log('=###########')
    const curUnit=[]
    layerArr.forEach(layer=>{
      if(layer.hasUsed.length<1){
        curUnit.push([layer]);
      }
      else if(layer.hasUsed.length===1){
        const layerFound = findLayer(layer.hasUsed[0]);
        const singleLayer = getLayerStructure([layerFound]);
        layer = [...singleLayer.flat(1),layer];
        // layer['hasUsed']=[];
        curUnit.push(layer);
      }
      else if(layer.hasUsed.length>1){
          const nested_aggregation = layer.hasUsed.map(lId=>{
              const layerFound = findLayer(lId);
              const singleLayer = getLayerStructure([layerFound]);
              return singleLayer[0];
          })
          // console.log('\n',JSON.stringify(nested_aggregation),'\n')
        layer['nested_aggregation']=nested_aggregation;
        layer['hasUsed']=[];
      curUnit.push([layer]);
      }
    })
  
  return curUnit;
  }
  
  const finalResult = JSON.stringify(getLayerStructure(layers));
  
  console.log(finalResult);